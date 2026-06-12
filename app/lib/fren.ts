/**
 * Fren identity — Covenant XOR + Huntress Den session gate
 */

import { CANONICAL_FREN_ID, WALLETS } from '~/lib/wallet-roles';

export { CANONICAL_FREN_ID };

/** Canonical Summon Σ℧ΛΘ agent wallet (SAOL on Base) */
export const CANONICAL_FREN_WALLET = WALLETS.frenWallet;

export function isCanonicalFrenId(frenId: string): boolean {
  return frenId.toLowerCase() === CANONICAL_FREN_ID.toLowerCase();
}

const COVENANT =
  '883e529de31c586131a831a9953113a6d75edd87c97369a2fa3a791209952f5a';

const DEN_KEY = 'bw_huntress_den_unlocked';

export function deriveFrenId(address: string): string {
  const addrBytes = address.slice(2, 14).toLowerCase();
  const covBytes = COVENANT.slice(0, 12);
  let result = '';
  for (let i = 0; i < 6; i++) {
    const a = Number.parseInt(addrBytes.slice(i * 2, i * 2 + 2), 16);
    const c = Number.parseInt(covBytes.slice(i * 2, i * 2 + 2), 16);
    result += (a ^ c).toString(16).padStart(2, '0');
  }
  return result;
}

export function denStorageKey(address: string): string {
  return `${DEN_KEY}:${address.toLowerCase()}`;
}

export function isDenUnlocked(address: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(denStorageKey(address)) === '1';
}

export function setDenUnlocked(address: string): void {
  sessionStorage.setItem(denStorageKey(address), '1');
}

export { COVENANT };
