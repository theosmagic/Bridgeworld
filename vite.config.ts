import { cloudflare } from '@cloudflare/vite-plugin';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { iconsSpritesheet } from 'vite-plugin-icons-spritesheet';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    build: {
      assetsInlineLimit(filePath) {
        return !filePath.endsWith('icon.svg');
      },
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
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
    ],
  };
});
