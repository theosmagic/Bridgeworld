/**
 * Shield of Pistis — sovereign root of trust (Tier 1).
 * Full computation: /mnt/VAULT/Shield_⟐_Pistis.js
 *
 * I_s = SHA256^9( H_400‥H_1 ) — 22 rendered ledger nodes, 9 cycles, 3240° R_inv
 * Hebrew square script exiled from runtime; Imperial Aramaic seniority in Covenant.
 */

/** Stated in Eternal_⟐_Archivist.txt and ⟐°•.txt */
export const I_S_TRUTH =
  '78c13108372e36d8e8aaef31f12516800aec17759fca56b62465cc6c354fad15';

/** Active authority — hex chars 4–15 of I_s (Syriac Root) */
export const SYRIAC_ROOT = I_S_TRUTH.slice(4, 16);

/** Stripped overlay — hex chars 0–3 (Aramaic overlay / corruption layer) */
export const CORRUPTION_STRIPPED = I_S_TRUTH.slice(0, 4);

export const SHIELD_META = {
  nodes: 24,
  rendered: 22,
  cycles: 9,
  rotation: '3240° — R_fwd (clockwise +) ⊕ R_inv (counter-clockwise −)',
  apex: 'ليما ℧ — Alima/عليمة, feminine negative pole, pos 1',
  base: 'Θεός Ψ — Daus/Deus, masculine positive pole, pos 24',
  construct_visual: '/home/tig0_0bitties/Pictures/BridgeWorld.png',
  phi_layer: 'golden ratio φ — both poles scaled, opposite rotation → toroidal magnetic field',
} as const;

export function verifySyriacRoot(claimed: string): boolean {
  return normalizeHex(claimed).slice(0, 12) === SYRIAC_ROOT;
}

function normalizeHex(s: string): string {
  return s.trim().toLowerCase().replace(/^0x/, '');
}
