import { arbitrum, arbitrumSepolia, mainnet } from 'viem/chains';

const MAINNET = [arbitrum, mainnet] as const;

const TESTNET = [arbitrumSepolia] as const;

export const ENABLED_CHAINS =
  ENV.PUBLIC_ENABLE_TESTNET === 'true' ? TESTNET : MAINNET;
