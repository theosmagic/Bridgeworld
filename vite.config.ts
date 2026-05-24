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
