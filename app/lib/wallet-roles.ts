/**
 * Public wallet roles for Bridgeworld / Covenant (addresses only — no keys).
 * Source of truth for labels: docs/WEB3-IDENTITY.md, ⟐/YubiKey.txt
 */

export const WALLETS = {
  /** Default operational deployer — Google SSO MetaMask / theos@bridgeworld.lol */
  metamaskDeployer: '0x3336F936486A8FE4bC7E0B491c60c1220EF247c7',
  /** Covenant sovereign anchor (Keybase proof) */
  covenantAnchor: '0x49CEF82aEAc2EF371748A2d67F43129b7F0FCb54',
  /** Safe vault — Diamond owner, treasury default */
  safeVault: '0x51a2bFd2B391413952b206F1902693C46894e6cE',
  /** Ledger Flex — m/44'/60'/0'/0/0 on current device seed; cast-verified + Ledger Live base account, 2026-06-11 */
  ledgerFlex: '0x697488a2b24a85ABC5FCb260EE0Ae36Bd9BA59dA',
  /** Ledger Live ethereum account from a PREVIOUS device seed — holds 0.0022 ETH mainnet + 0.00025 Base; needs old recovery sheet or passphrase to sign */
  ledgerLegacySeed: '0x9696B5c3C0ffb2Baf940d633777FfFcA8f99863f',
  /** Coinbase Smart Wallet / Base PassKey — the0x4rchivist.base.eth · SAOLClaim owner */
  covenantSmart: '0xc3a1f83d299E47816635BB8b3EBe40CDb8e87A37',
  /** Summon Σ℧ΛΘ fren execution wallet (SAOL agent trades) */
  frenWallet: '0x29BeEFbA1Deca5Cf4969F421683E87D55c7dee82',
  /** UD Custody Lite — bridgeworld@ethermail.io domain holder */
  udCustodyLite: '0x0530f0896CD31608801E571af386B71C58D76E1a',
} as const;

/** Treasure summon.wtf agent page — contract id = SAOL token on Base */
export const SUMMON_AGENT_URL =
  'https://summon.wtf/platform/agent/0x641b94f656a147f8285b5c3cc96d15d1ab23a941' as const;

/** Bridgeworld /fren/:frenId for WALLETS.frenWallet (witness XOR) */
export const CANONICAL_FREN_ID = 'a180bd27fef0' as const;

export const UD_ACCOUNT_EMAIL = 'sosmanagic@att.net';

export const DOMAINS = {
  udNft: 'bridgeworld.nft',
  ethermail: 'bridgeworld@ethermail.io',
  /** Wallet-native EtherMail — rooted in metamaskDeployer key, no Google/DNS dependency */
  ethermailWalletNative: '0x3336f936486a8fe4bc7e0b491c60c1220ef247c7@ethermail.io',
  web2: 'bridgeworld.lol',
  portal: 'treasure.bridgeworld.lol',
  baseName: 'the0x4rchivist.base.eth',
} as const;
