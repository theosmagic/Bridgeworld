# Web3 Identity — Unstoppable Domains & Wallet Stack

Operational map for **who owns what** and **which wallet signs which action**. Sources: `⟐/YubiKey.txt`, `⟐/Keys/keybase.md`, Bridgeworld deploy scripts.

**Do not merge:** UD login account ≠ onchain domain owner ≠ Cloudflare operator ≠ Covenant liturgical keys.

---

## 1. Unstoppable Domains — two layers

| Layer | What it is | Yours |
|-------|------------|--------|
| **UD account** | Website login, marketplace, domain dashboard | `sosmanagic@att.net` (same email as Cloudflare API in YubiKey) |
| **Onchain owner** | Wallet that holds the domain NFT | See wallet table below |

UD does **not** create a bank-style wallet by default. When you **claim** a domain you either:

- Connect **self-custody** (MetaMask, Ledger, etc.), or  
- Use **Custody Lite** — UD-generated address holding the NFT until you transfer out.

### Domain → owner (current)

| Domain / identity | Onchain holder | Role |
|-------------------|----------------|------|
| `bridgeworld.nft` | `0x7911670881a81F8410d06053d7B3c237cE77b9B4` (Polygon UNS, verified 2026-06-11 — matches no documented wallet; presumed UD custody) | Phase 1 IPFS `IPFS_REDIRECT` target |
| `bridgeworld.ethermail` / `bridgeworld@ethermail.io` | **Custody Lite** `0x0530f0896CD31608801E571af386B71C58D76E1a` | UD-managed; EtherMail identity |
| `0x3336f936…@ethermail.io` | **MetaMask** `0x3336F936486A8FE4bC7E0B491c60c1220EF247c7` | Wallet-native EtherMail — email custody roots in the wallet key itself, no Google/DNS chain |
| ENS / Base names | `0xc3a1f83d299E47816635BB8b3EBe40CDb8e87A37` | `the0x4rchivist.base.eth` (Coinbase Smart Wallet / PassKey) |

**API (automation):** `UNSTOPPABLE_DOMAINS_API` in `⟐/YubiKey.txt` — load at runtime only; never commit.

```bash
# After IPFS deploy (from Bridgeworld/)
ud domains dns record add bridgeworld.nft --type IPFS_REDIRECT --value ipfs://<CID>
```

To use the domain in external dApps (EtherMail, wallet sign-in), **transfer** from Custody Lite to a self-custody address below via UD dashboard → *Transfer*.

---

## 2. Wallet stack (signing order)

```
                    ┌─────────────────────────────────────┐
                    │  UD account: sosmanagic@att.net      │
                    │  (dashboard + API, not a chain key)  │
                    └──────────────────┬──────────────────┘
                                       │ manages
                    ┌──────────────────▼──────────────────┐
                    │  Custody Lite 0x0530f089…             │
                    │  bridgeworld@ethermail.io domain NFT   │
                    └─────────────────────────────────────┘

  DEFAULT OPS (Bridgeworld deploy / Google SSO)
  ┌─────────────────────────────────────────────────────────┐
  │ MetaMask  0x3336F936486A8FE4bC7E0B491c60c1220EF247c7     │
  │ theos@bridgeworld.lol · Google SSO                       │
  └───────────────┬─────────────────────────────────────────┘
                  │ also via USB
  ┌───────────────▼─────────────────────────────────────────┐
  │ Ledger Flex  0x697488a2b24a85ABC5FCb260EE0Ae36Bd9BA59dA │
  │ (m/44'/60'/0'/0/0 · cast-verified on-device 2026-06-11)  │
  │ stale Ledger Live entry 0x9696…863f: NOT on this seed —  │
  │ holds 0.0022 ETH mainnet + 0.00025 Base, origin unknown  │
  └─────────────────────────────────────────────────────────┘

  COVENANT / TREASURE DIAMOND
  ┌─────────────────────────────────────────────────────────┐
  │ Covenant anchor  0x49CEF82aEAc2EF371748A2d67F43129b7F0FCb54 │
  │ (Keybase sovereign anchor · Arbitrum EIP-7702)           │
  └───────────────┬─────────────────────────────────────────┘
                  │ owns / routes to
  ┌───────────────▼─────────────────────────────────────────┐
  │ Safe vault  0x51a2bFd2B391413952b206F1902693C46894e6cE  │
  │ Diamond owner · merkle allocations                      │
  └─────────────────────────────────────────────────────────┘

  MOBILE / BASE / ENS PRIMARY
  ┌─────────────────────────────────────────────────────────┐
  │ Coinbase Smart Wallet (PassKey)  0xc3a1f83d…            │
  │ Samsung Fold7 · the0x4rchivist.base.eth                 │
  │ SAOLClaim · ENS COVENANT_SMART · Coinbase Paymaster     │
  └─────────────────────────────────────────────────────────┘

  SUMMON FREN (Treasure summon.wtf · SAOL agent)
  ┌─────────────────────────────────────────────────────────┐
  │ Agent Σ℧ΛΘ · contract = SAOL token on Base              │
  │ Fren wallet  0x29BeEFbA1Deca5Cf4969F421683E87D55c7dee82 │
  │ Operator     0xc3a1f83d… (the0x4rchivist.base.eth)      │
  │ Summon       summon.wtf/platform/agent/0x641b94…        │
  │ Bridgeworld  /fren/a180bd27fef0 (canonical Piazza)      │
  └─────────────────────────────────────────────────────────┘
```

---

## 3. Which wallet for which action

| Action | Sign with | Notes |
|--------|-----------|--------|
| UD dashboard / set IPFS hash | **UD account** login | Or `ud` CLI + API key from YubiKey |
| `bridgeworld.nft` DNS records onchain | **Domain owner wallet** | May be Custody Lite or MetaMask if transferred |
| Forge deploy (TreasureDiamond script) | **0x3336…** MetaMask (default) | `ETH_PRIVATE_KEY` or MetaMask broadcast |
| Diamond **owner** txs | **Safe 0x51a2…** | Multisig queue on [app.safe.global](https://app.safe.global) |
| Covenant anchor ops | **0x49CEF82a…** | Documented sovereign anchor in Keybase proof |
| High-value / cold path | **Ledger Flex → MetaMask** | Same 0x3336 flow with hardware confirmation |
| Base smart wallet / SAOL / x402 | **0xc3a1f83d…** PassKey | Default in YubiKey `DEFAULT_ADDRESS` · SAOLClaim owner |
| Summon Σ℧ΛΘ agent trades | **0x29BeEF…** fren wallet | [summon.wtf agent](https://summon.wtf/platform/agent/0x641b94f656a147f8285b5c3cc96d15d1ab23a941) · SAOL `0x641b94…` |
| Cloudflare DNS / Workers | **API key** (YubiKey) | Not a wallet — `scripts/cloudflare-dns-ipfs.mjs` |

---

## 4. Liturgical email ↔ wallet (HKDF tree)

From `⟐/Keys/liturgical_keygen.py` — **deterministic identity**, not onchain addresses:

| Liturgical | Email | Chain role |
|------------|-------|------------|
| Σ℧ΛΘ | `sosmanagic@att.net` | UD + Cloudflare operator identity |
| Θεός | `theos@bridgeworld.lol` | MetaMask / deploy SSO |
| •⟐• | `system76.ht.local` | Eternal Scribe / observatory |

These are **Tier 1 operational labels**, not replacements for `I_s` or witness seal `883e529d…`.

---

## 5. Self-custody migration (optional)

If you want `bridgeworld.ethermail` on MetaMask or Ledger instead of Custody Lite:

1. UD dashboard → domain → **Transfer** → `0x3336F936486A8FE4bC7E0B491c60c1220EF247c7` (or Safe `0x51a2…` for vault custody).
2. Re-run IPFS record updates from the **new owner** wallet or UD if still linked.
3. Update this doc’s owner column — onchain owner is Tier 1 for Web3 resolution.

Until transfer, EtherMail and UD tools work against **Custody Lite** without you handling the NFT private key directly.

---

## 6. Summon Fren (Σ℧ΛΘ · SAOL)

Canonical Treasure [summon.wtf](https://summon.wtf) agent wired in `app/data/ecosystem.ts` (`FREN_AGENT`) and `app/lib/wallet-roles.ts`.

| Field | Value |
|-------|--------|
| Agent name | **Σ℧ΛΘ** |
| Token | **SAOL** on Base (8453) |
| Contract / Summon ID | `0x641b94f656a147f8285b5c3cc96d15d1ab23a941` |
| Fren wallet | `0x29BeEFbA1Deca5Cf4969F421683E87D55c7dee82` |
| Operator | `0xc3a1f83d299E47816635BB8b3EBe40CDb8e87A37` · `the0x4rchivist.base.eth` |
| Summon URL | https://summon.wtf/platform/agent/0x641b94f656a147f8285b5c3cc96d15d1ab23a941 |
| Bridgeworld Piazza | `/fren/a180bd27fef0` |

`GET /api/manifest` includes the `fren` object for edge consumers.

---

## 7. Related commands

```bash
# Cloudflare Web2 bridge (YubiKey)
npm run cf:dns-ipfs:apply
npm run publish:ipfs-bridge

# Covenant Tier-1 verify (unchanged by wallet choice)
bash /mnt/VAULT/Treasure/Covenant/verify-covenant.sh
```

See also: [`WEB3-GATEWAY.md`](./WEB3-GATEWAY.md), [`../Covenant/archivist/COVENANT-TRUST-MAP.md`](../Covenant/archivist/COVENANT-TRUST-MAP.md), [`⟐/ENS/llms-context.md`](../Covenant/⟐/ENS/llms-context.md).
