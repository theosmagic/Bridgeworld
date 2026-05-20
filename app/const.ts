import { arbitrum, arbitrumSepolia, base, mainnet } from 'viem/chains';

const MAINNET = [base, arbitrum, mainnet] as const;

const TESTNET = [arbitrumSepolia] as const;

export const ENABLED_CHAINS =
  (ENV as Record<string, string>)['PUBLIC_ENABLE_TESTNET'] === 'true' ? TESTNET : MAINNET;
