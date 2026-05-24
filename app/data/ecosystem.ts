export interface ProjectManifest {
  name: string;
  type: string;
  description: string;
  url: string;
  gameUrl: string;
  image: string;
}

export const ecosystemProject: ProjectManifest = {
  name: 'Bridgeworld',
  type: 'AI Agent & Game Console',
  description:
    'Sovereign reconstruction of Bridgeworld Cycles 1 & 2 — Harvester staking mechanics and Golem autonomous agent systems on Abstract Chain.',
  url: 'treasure.bridgeworld.lol',
  gameUrl: 'https://treasure.bridgeworld.lol/play',
  image: '/img/bridgeworld-reconstruction.webp',
};

export const CHAINS = {
  BASE:     8453,
  ABSTRACT: 2741,
  ETHEREUM: 1,
  ARBITRUM: 42161,
  POLYGON:  137,
} as const;

export const CONTRACTS = {
  SAOL_BASE:          '0x641b94f656a147f8285b5c3cc96d15d1ab23a941',
  MAGIC_ARBITRUM:     '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
  LEGIONS_ARBITRUM:   '0xfE8c1ac365bA6780AEc5a985D989b327C27670A1',
  TREASURES_ARBITRUM: '0xEBba467eCB6b21239178033189CeAE27CA12EaDf',
} as const;

export const SAOL = {
  address:     '0x641b94f656a147f8285b5c3cc96d15d1ab23a941' as `0x${string}`,
  name:        'Σ℧ΛΘ',
  symbol:      'SAOL',
  decimals:    18,
  totalSupply: 1_000_000_000n * 10n ** 18n,
  chain:       8453,
  sigil:       'Θεός°•⟐•Σ℧ΛΘ',
} as const;

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }] },
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'Transfer', type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to',   type: 'address', indexed: true },
      { name: 'value',type: 'uint256', indexed: false },
    ] },
] as const;

export const IPNS = 'k51qzi5uqu5dgu4makc3vj55pcnkzvvq5ako1kk8u6udon6j85eypuudm4psus';

export const SAOL_CLAIM = {
  address: '0x68834321d2697ddfab1952123b19b49927cc079f' as `0x${string}`,
  owner:   '0xc3a1f83d299e47816635bb8b3ebe40cdb8e87a37' as `0x${string}`,
  chain:   8453,
} as const;

export const SAOL_CLAIM_ABI = [
  { name: 'openClaims',  type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'closeClaims', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimOpen',   type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'hasClaimed',  type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'claim', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'amount',  type: 'uint256' },
      { name: 'proof',   type: 'bytes32[]' },
    ],
    outputs: [] },
  { name: 'recover', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'token',  type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [] },
  { name: 'ClaimToggled', type: 'event',
    inputs: [{ name: 'open', type: 'bool', indexed: false }] },
  { name: 'Recovered', type: 'event',
    inputs: [
      { name: 'token',  type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ] },
] as const;
