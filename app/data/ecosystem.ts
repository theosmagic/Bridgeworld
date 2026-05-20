export interface ProjectManifest {
  name: string;
  type: string;
  description: string;
  url: string;
  gameUrl: string;
  image: string;
}

export const ecosystemProject: ProjectManifest = {
  name: 'Bridgeworld.lol',
  type: 'AI Agent & Game Console',
  description:
    'Sovereign reconstruction of Bridgeworld Cycles 1 & 2 — Harvester staking mechanics and Golem autonomous agent systems on Abstract Chain.',
  url: 'treasure.bridgeworld.lol',
  gameUrl: 'https://treasure.bridgeworld.lol/play',
  image: '/img/bridgeworld-reconstruction.webp',
};

export const CHAINS = {
  ABSTRACT: 2741,
  ETHEREUM: 1,
  ARBITRUM: 42161,
  POLYGON: 137,
} as const;

export const CONTRACTS = {
  MAGIC_ARBITRUM: '0x539bdE0d7Dbd336b79148AA742883198BBF60342',
  LEGIONS_ARBITRUM: '0xfE8c1ac365bA6780AEc5a985D989b327C27670A1',
  TREASURES_ARBITRUM: '0xEBba467eCB6b21239178033189CeAE27CA12EaDf',
} as const;

export const IPNS = 'k51qzi5uqu5dgu4makc3vj55pcnkzvvq5ako1kk8u6udon6j85eypuudm4psus';
