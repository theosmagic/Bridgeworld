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

export function getConfig() {
  return createConfig(
    getDefaultConfig({
      transports: ENABLED_CHAINS.reduce<{
        [key in Chain['id']]: Transport;
      }>((acc, chain) => {
        acc[chain.id] = http(
          `https://${chain.id}.rpc.thirdweb.com/${ENV.PUBLIC_THIRDWEB_KEY}`,
        );
        return acc;
      }, {}),
      storage: createStorage({
        storage: cookieStorage,
      }),
      walletConnectProjectId: ENV.PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
      chains: ENABLED_CHAINS,
      appName: 'Treasure - Agent Creator',
      appDescription: 'Agent Creator',
      ssr: true,
    }),
  );
}
