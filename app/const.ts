import { arbitrum, arbitrumSepolia, base, mainnet } from 'viem/chains';
import { defineChain } from 'viem';

// Abstract chain (chainId 2741) — not yet in viem, defined here from sovereign registry
export const abstract = defineChain({
  id: 2741,
  name: 'Abstract',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.mainnet.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abstract Explorer', url: 'https://explorer.abstract.money' },
  },
  testnet: false,
});

const MAINNET = [base, arbitrum, abstract, mainnet] as const;

const TESTNET = [arbitrumSepolia] as const;

export const ENABLED_CHAINS =
  (ENV as Record<string, string>)['PUBLIC_ENABLE_TESTNET'] === 'true' ? TESTNET : MAINNET;
