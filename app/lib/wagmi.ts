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

// ── Sovereign RPC endpoints ────────────────────────────────────────────────────
// Sourced from YubiKey.txt reference (read-only credential pointer).
// Abstract (2741): treasure-node sovereign infrastructure on system76.ht.local,
//   with public abs.xyz as the reachable fallback for Cloudflare Workers.
// Base (8453): Coinbase Developer Platform — BASE_MAINNET_RPC_ENDPOINT.
const SOVEREIGN_RPCS: Partial<Record<number, string>> = {
  8453: e['BASE_MAINNET_RPC_ENDPOINT']
    ?? 'https://mainnet.base.org',
  2741: e['ABSTRACT_RPC_ENDPOINT']
    ?? 'https://api.mainnet.abs.xyz',
};

function chainTransport(chain: Chain): Transport {
  // Sovereign override first
  if (SOVEREIGN_RPCS[chain.id]) {
    return http(SOVEREIGN_RPCS[chain.id]);
  }
  // ThirdWeb key second
  const key = e['PUBLIC_THIRDWEB_KEY'] ?? '';
  if (key) {
    return http(`https://${chain.id}.rpc.thirdweb.com/${key}`);
  }
  // Viem default (chain.rpcUrls.default)
  return http();
}

export function getConfig() {
  return createConfig(
    getDefaultConfig({
      transports: ENABLED_CHAINS.reduce<{
        [key in Chain['id']]: Transport;
      }>((acc, chain) => {
        acc[chain.id] = chainTransport(chain);
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
