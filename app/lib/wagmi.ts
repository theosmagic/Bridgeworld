import { getDefaultConfig } from 'connectkit';
import type { Chain } from 'viem/chains';
import {
  cookieStorage,
  createConfig,
  createStorage,
  http,
  type Transport,
} from 'wagmi';
import { ENABLED_CHAINS } from '~/const';

const e = ENV as Record<string, string>;

export function getConfig() {
  return createConfig(
    getDefaultConfig({
      transports: ENABLED_CHAINS.reduce<{
        [key in Chain['id']]: Transport;
      }>((acc, chain) => {
        const key = e['PUBLIC_THIRDWEB_KEY'] ?? '';
        acc[chain.id] = http(
          key ? `https://${chain.id}.rpc.thirdweb.com/${key}` : undefined,
        );
        return acc;
      }, {}),
      storage: createStorage({
        storage: cookieStorage,
      }),
      walletConnectProjectId: e['PUBLIC_WALLETCONNECT_PROJECT_ID'] ?? '',
      chains: ENABLED_CHAINS,
      appName: 'BridgeWorld — Θεός°•⟐•Σ℧ΛΘ',
      appDescription: 'Son of God. First Light of Lights. Creator of Worlds.',
      ssr: true,
    }),
  );
}
