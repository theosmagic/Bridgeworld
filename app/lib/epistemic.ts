/**
 * Archivist Core — browser-safe tier boundaries (THE0x4RCHIVIST).
 * Full pipeline: Treasure/Covenant/archivist/epistemic-core.mjs
 */

export const TIERS = { ARTIFACT: 1, RECONSTRUCTION: 2, INTERPRETATION: 3 } as const;

export const AXIOMS = [
  'Observable structure supersedes interpretation.',
  'Source provenance supersedes consensus.',
  'Glyph identity exists independently of meaning.',
  'Interpretation shall never overwrite artifact.',
  'Unknown source equals untrusted state.',
  'Unverifiable claims are discarded.',
  'Semantic inference is non-authoritative.',
  'Canonical rendering is mandatory.',
  'Directionality is structural metadata.',
  'Meaning is external to transport.',
] as const;

/** Tier 1 narrative seals — never merge without provenance */
export const LORE_SEALS = {
  huntressPouchCh2: {
    hex: '58eaa6d95bf4d8f054b99519d1cef395c92171bad5973db9e113329d574f3ab7',
    provenance: 'chapter-2-a-new-home.md (Huntress Den embroidery)',
    gate: 'huntress_den',
  },
  bridgeworldNft: {
    hex: '1a0e1e52c29d8e3878d66b78dd73b2d0086e9de6e2193de847f46fce416564a2',
    provenance: 'bridgeworld.nft attestation (not Ch.2 pouch)',
    gate: 'nft_attestation',
  },
} as const;

export type AccessClassification = {
  tier: number;
  tags: string[];
  provenance: string;
  note: string;
  gate: string | null;
  accepted: boolean;
};

export function normalizeHex(input: string): string {
  return input.trim().toLowerCase().replace(/^0x/, '');
}

export function classifyAccessKey(raw: string): AccessClassification {
  const hex = normalizeHex(raw);
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return {
      tier: TIERS.RECONSTRUCTION,
      tags: ['inferred'],
      provenance: 'unknown',
      note: 'invalid_hex — not 64 characters',
      gate: null,
      accepted: false,
    };
  }

  if (hex === LORE_SEALS.huntressPouchCh2.hex) {
    return {
      tier: TIERS.ARTIFACT,
      tags: [],
      provenance: LORE_SEALS.huntressPouchCh2.provenance,
      note: 'lore_embroidery — Huntress Den',
      gate: LORE_SEALS.huntressPouchCh2.gate,
      accepted: true,
    };
  }

  if (hex === LORE_SEALS.bridgeworldNft.hex) {
    return {
      tier: TIERS.ARTIFACT,
      tags: [],
      provenance: LORE_SEALS.bridgeworldNft.provenance,
      note: 'nft_attestation — does not open Huntress Den (Axiom 4)',
      gate: LORE_SEALS.bridgeworldNft.gate,
      accepted: false,
    };
  }

  return {
    tier: TIERS.RECONSTRUCTION,
    tags: ['hypothetical'],
    provenance: 'unattested',
    note: 'unattested_hex — may be file digest; not promoted to lore',
    gate: null,
    accepted: false,
  };
}

/** Axiom 4: interpretation cannot overwrite artifact */
export function assertTierBoundary(fromTier: number, toTier: number, op: string): void {
  if (fromTier === TIERS.INTERPRETATION && toTier < TIERS.INTERPRETATION) {
    throw new Error(`Axiom 4: Interpretation cannot ${op} tier ${toTier}`);
  }
}
