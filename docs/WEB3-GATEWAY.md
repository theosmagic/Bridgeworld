# Web3 Gateway — bridgeworld.lol ↔ IPFS ↔ Unstoppable

**Model:** Web3 domain = **source of truth** (CID pointer). `bridgeworld.lol` = **Web2 bridge** (HTTPS for normal browsers via Cloudflare).

You do **not** replace domain registration. You change **what DNS serves** and keep a thin edge for APIs that static IPFS cannot run.

---

## What you have today (Phase 0)

| Host | Role | Stack |
|------|------|--------|
| `bridgeworld.lol` | Apex + Farcaster manifest | Cloudflare Worker (`wrangler.jsonc`) |
| `treasure.bridgeworld.lol` | Fren portal + `/api/*` + agent WS | Same Worker |
| `bridgeworld.nft` | UD onchain name (target) | `IPFS_REDIRECT` / hosting record |
| `bridgeworld@ethermail.io` | Identity email | Custody Lite `0x0530f089…` — see [`WEB3-IDENTITY.md`](./WEB3-IDENTITY.md) |

Phase 1 static export: `pnpm run deploy:ipfs` → `scripts/deploy-ipfs.mjs` (Arweave manifest today; set UD to `ar://…` or `ipfs://<CID>` after IPFS pin).

---

## Target topology

```
                    ┌─────────────────────────────┐
                    │  UD: bridgeworld.nft        │
                    │  (or .ethermail / .crypto)  │
                    │  IPFS_REDIRECT / IPFS hash  │  ← update on each deploy
                    └──────────────┬──────────────┘
                                   │ resolves CID
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
   ipfs://Qm…              dweb.link / .ipfs.dweb.link   arweave.net/…
          │                        │
          └────────────┬───────────┘
                       ▼
            Cloudflare IPFS Gateway
            (cloudflare-ipfs.com)
                       │
                       ▼
            bridgeworld.lol  ← CNAME / Worker bridge
            treasure.bridgeworld.lol ← keep Worker (API, WS, subgraph)
```

---

## Step 1 — Pin content (get a CID)

From Bridgeworld repo:

```bash
export TURBO_PRIVATE_KEY='…'   # Arweave JWK JSON — never commit
pnpm run deploy:ipfs
```

Script prints:

- Arweave manifest: `https://arweave.net/<txId>`
- UD command: `ud domains dns record add bridgeworld.nft --type IPFS_REDIRECT --value ar://<txId>`

For a **classic IPFS CID** (Cloudflare gateway path `/ipfs/Qm…`):

```bash
# After BUILD_TARGET=ipfs build → build/client/
ipfs add -r -Q build/client    # or pin via Pinata / web3.storage
```

Use that `Qm…` in UD: `--value ipfs://Qm…`

---

## Step 2 — Unstoppable (source of truth)

In [Unstoppable Domains](https://unstoppabledomains.com/) dashboard or `ud` CLI:

```bash
# List / clear old records first if needed
ud domains dns record add bridgeworld.nft \
  --type IPFS_REDIRECT \
  --value ipfs://QmYourCidHere
```

For **bridgeworld.ethermail** (if registered as a UD TLD name): same record type — UD calls it `IPFS_REDIRECT` / hosting IPFS hash depending on product UI.

**Rule:** Every new deploy → new CID → update UD record (login: `sosmanagic@att.net` or domain owner wallet). `bridgeworld.lol` DNS follows in step 3.

See [`WEB3-IDENTITY.md`](./WEB3-IDENTITY.md) for Custody Lite vs MetaMask ownership.

---

## Step 3 — Cloudflare (Web2 bridge)

Zone: **bridgeworld.lol** — `account_id` + zone in `⟐/YubiKey.txt` (wired in `wrangler.jsonc`).

### Your configured bridge (YubiKey.txt)

| Record | Name | Value |
|--------|------|--------|
| TXT (DNSLink) | `_dnslink.ipfs.bridgeworld.lol` | `dnslink=/ipns/k51qzi5uqu5dgu4makc3vj55pcnkzvvq5ako1kk8u6udon6j85eypuudm4psus` |
| CNAME | `ipfs.bridgeworld.lol` | `ipfs.cloudflare.com` (proxied, Web3 Gateway) |

**Live URL:** `https://ipfs.bridgeworld.lol/ipns/k51qzi5uqu5dgu4makc3vj55pcnkzvvq5ako1kk8u6udon6j85eypuudm4psus`

Sync DNS from YubiKey (no keys in git):

```bash
npm run build:ipfs
npm run publish:ipfs-bridge    # kubo add + DNSLink → /ipfs/<CID>
pnpm run cf:dns-ipfs:apply     # restore IPNS dnslink only (--dnslink=ipns via publish script)
```

### Option A — Subdomain gateway (active)

| Type | Name | Target |
|------|------|--------|
| CNAME | `ipfs` | `cloudflare-ipfs.com` |

Users open: `https://ipfs.bridgeworld.lol/ipns/<key>` or `/ipfs/Qm…` after pin

### Option B — Apex `bridgeworld.lol` serves IPFS lander

**Do not** point `@` Worker and IPFS to the same host without a plan.

Pick one:

1. **Redirect apex → IPFS gateway URL** (Page Rule / Redirect Rule):  
   `https://bridgeworld.lol` → `https://ipfs.bridgeworld.lol/ipfs/Qm…`  
   Update redirect when CID changes (or use a Worker that reads CID from env).

2. **Worker proxy** (flexible): small Worker fetches `https://cloudflare-ipfs.com/ipfs/${CID}` for `GET /` and static paths; keep `/api/*` on `treasure.bridgeworld.lol`.

3. **CNAME flattening** (limited): some setups CNAME `@` to a gateway host — verify CF supports for your plan; apex API routes break if you remove the Worker route entirely.

### Option C — `www` only (safest hybrid)

| Type | Name | Target |
|------|------|--------|
| CNAME | `www` | `cloudflare-ipfs.com` (path `/ipfs/Qm…` via redirect rule) |
| A/AAAA or CNAME | `@ | keep Worker OR redirect to `www` |

Leave **`treasure.bridgeworld.lol`** on the existing Worker for subgraph, MemOS, Golem WS, Farcaster webhooks.

---

## Can you “replace” bridgeworld.lol?

| Question | Answer |
|----------|--------|
| Replace **registrar**? | No — keep ICANN domain on Cloudflare. |
| Replace **static UI** with IPFS? | **Yes** — lander, docs, Cycle 1 read-only UI from `build:ipfs`. |
| Replace **entire** current site? | **Not yet** — Worker SSR, `/api/subgraph`, `/agents/chat/*`, Farcaster need edge compute. |
| Same content as Web3 domain on apex? | **Yes** — bridge DNS/gateway to the **same CID** you set on UD. |

**Practical split:**

- `bridgeworld.lol` / `www` → IPFS CID (immutable marketing + SPA shell)
- `treasure.bridgeworld.lol` → Cloudflare Worker (dynamic community layer)

---

## Verify

```bash
# UD resolution (browser or IPFS client)
https://bridgeworld.nft.ipfs.dweb.link/   # UD gateway format varies by TLD

# Cloudflare gateway
curl -sI "https://cloudflare-ipfs.com/ipfs/QmYourCid"

# Your bridge
curl -sI "https://ipfs.bridgeworld.lol/ipfs/QmYourCid"

bash ../Covenant/verify-covenant.sh
```

---

## Covenant alignment

- Tier 1 seals unchanged — CID is **transport**, not `I_s`.
- `1a0e1e52…` = `bridgeworld.nft` attestation hash in lore — **not** the IPFS CID.
- Phase 3: add Autonomys archive (`pnpm run autonomys:store`) alongside IPFS.

See also: [`LORE-TO-CODE.md`](./LORE-TO-CODE.md), [`../Covenant/archivist/COVENANT-TRUST-MAP.md`](../Covenant/archivist/COVENANT-TRUST-MAP.md).
