import type { Config } from '@react-router/dev/config';

// BUILD_TARGET=ipfs → SPA mode (pure static, IPFS-compatible)
// BUILD_TARGET unset  → SSR mode (Cloudflare Workers, default)
const isIPFS = process.env.BUILD_TARGET === 'ipfs';

export default {
  ssr: !isIPFS,
  future: {
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
