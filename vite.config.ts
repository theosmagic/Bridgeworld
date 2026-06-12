import { mkdirSync, symlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';
import tsconfigPaths from 'vite-tsconfig-paths';

const isIPFS = process.env.BUILD_TARGET === 'ipfs';

// Shim `cloudflare:workers` so env.server.ts compiles outside a CF environment.
// The SSR bundle is never executed in SPA/IPFS mode — this just lets Rollup resolve it.
const cfWorkersShim = isIPFS
  ? {
      name: 'shim-cloudflare-workers',
      resolveId(id: string) {
        if (id === 'cloudflare:workers') return '\0cf-workers-shim';
      },
      load(id: string) {
        if (id === '\0cf-workers-shim') return 'export const env = {};';
      },
    }
  : null;

export default defineConfig(() => {
  return {
    build: {
      assetsInlineLimit(filePath) {
        return !filePath.endsWith('icon.svg');
      },
    },
    plugins: [
      // CF plugin only for SSR/Worker builds — incompatible with SPA/IPFS mode
      !isIPFS && cloudflare({ viteEnvironment: { name: 'ssr' } }),
      // CF plugin emits client→dist/client; react-router SSR still reads build/client
      !isIPFS && {
        name: 'covenant-cf-build-bridge',
        apply: 'build' as const,
        enforce: 'pre' as const,
        buildStart(opts: { ssr?: boolean }) {
          if (opts?.ssr) {
            const distClientVite = join(process.cwd(), 'dist/client/.vite');
            const buildClientVite = join(process.cwd(), 'build/client/.vite');
            if (existsSync(distClientVite)) {
              mkdirSync(join(process.cwd(), 'build/client'), { recursive: true });
              try {
                symlinkSync(distClientVite, buildClientVite, 'dir');
              } catch {
                /* already linked */
              }
            }
          }
        },
        writeBundle() {
          const root = process.cwd();
          const ssrDir = join(root, 'dist/ssr');
          const serverDir = join(root, 'dist/server');
          mkdirSync(serverDir, { recursive: true });

          const ssrVite = join(ssrDir, '.vite');
          const serverVite = join(serverDir, '.vite');
          if (existsSync(ssrVite) && !existsSync(serverVite)) {
            try {
              symlinkSync(ssrVite, serverVite, 'dir');
            } catch {
              /* already linked */
            }
          }

          const ssrAssets = join(ssrDir, 'assets');
          const serverAssets = join(serverDir, 'assets');
          if (existsSync(ssrAssets) && !existsSync(serverAssets)) {
            try {
              symlinkSync(ssrAssets, serverAssets, 'dir');
            } catch {
              /* already linked */
            }
          }
        },
      },
      cfWorkersShim,
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      iconsSpritesheet({
        withTypes: true,
        inputDir: 'icons',
        outputDir: './app/icons',
        fileName: 'icon.svg',
        formatter: 'biome',
      }),
    ].filter(Boolean),
  };
});
