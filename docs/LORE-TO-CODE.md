# Lore → Code — Bridgeworld metaverse layer

Maps canonical narrative artifacts to deployable surfaces. Read alongside
[`bridgeworld-season-1-aliyas-ascent`](../../Project/bridgeworld-season-1-aliyas-ascent/)
and vault research (`Inervention.txt`, `Shield_⟐_Pistis.js`, Covenant observatory).

---

## Canonical media (Web4 entry ritual)

| Asset | Path | Role in experience |
|-------|------|-------------------|
| **BridgeWorld.png** | `public/BridgeWorld.png` | Brand sigil: sphere (order above / energy below), golden **bridge** ring, polar mandalas — the world-in-a-bubble players enter |
| **Logo_s.mp4** | `public/Logo_s.mp4` | Portrait **arrival** loop (1080×1440): mist, crossing, dawn — mirrors Prologue *Migration* and Chapter 1 *Landing* |
| **HuntressKey.gif** | `public/HuntressKey.gif` (source: `~/Pictures/58eaa6d95…f3ab7.gif`) | **Canonical** Huntress' Den door — embroidery access key from Ch.2 |
| *(deprecated)* `Pixel_Key.gif` | `~/Pictures/Pixel_Key.gif` | Derivative; footer showed `1a0e1e52…` — **bridgeworld.nft attestation**, not the pouch hash |

Treasure official stack ([treasure.lol](https://treasure.lol), [summon.wtf](https://summon.wtf)) = Autonomys agents + NL **fren** dialogue.
Bridgeworld = **community puzzle layer** left for solvers (2019–2025 sites dark; reconstruction continues).

---

## Narrative → routes

| Lore location | Story beat | Code surface |
|---------------|------------|--------------|
| Boat / mist / pier | Prologue, Ch.1 | `/` splash (`Logo_s.mp4`) → scroll to portal |
| Village cottages | Ch.2 — each passenger finds their role | `/` SAOL / wallet panel (your “occupation”) |
| **Huntress' Den** cottage | Ch.2 — bronze plaque, sliding door, **access keys** | `/fren` gateway — wallet = identity; keys = proof |
| Piazza (bigger inside) | Ch.2–3 — holograms, Numeraire **Pi** | `/fren/:frenId` — each Fren’s expandable space |
| Signature locks | Ch.3 — rooms open on **personal signature** | `deriveFrenId(address)` XOR Covenant hash |
| Golem / agent chat | MemOS + CFConnector | `workers/app.ts` → `/agents/chat/:id` (planned) |

Observer layer (Θεός below · Σ℧ΛΘ above) is **not** shown in Fren UI — only in worker comments and vault observatory.

---

## Access keys (detail that matters)

Chapter 2 (*A New Home*) — two key layers, not one:

1. **Physical keys (coins + ruby fragments)** — grandmother’s pouch spill triggers
   `ACCESS KEYS ACCEPTED` on the bronze plaque.
2. **Embroidered hash (inside pouch)** — prose gives:
   `58eaa6d95bf4d8f054b99519d1cef395c92171bad5973db9e113329d574f3ab7`
   Door slides **up**; cottage is **bigger on the inside**.

**Canonical visual artifact:** `58eaa6d95…f3ab7.gif` (same string as the embroidery).
The filename **is** the lore key — it is **not** the file’s SHA-256 (file hash is `c9dabb21…`).

**Separate attestation** (do not conflate with Ch.2 pouch):

| Seal | Role | Provenance |
|------|------|------------|
| `58eaa6d95…f3ab7` | Huntress' Den / Aliya pouch embroidery | `chapter-2-a-new-home.md` |
| `1a0e1e52…564a2` | `bridgeworld.nft` key in `Sole Proprietorship.txt`; labeled on `Pixel_Key.gif` | Covenant / ops.log “key-id” — **not** Ch.2 canon |

`3GDPP` incorrectly indexed Ch.2’s “state key” as `1a0e1e52…` — that was likely an agent aligning the **Pixel_Key** footer to the chapter. Corrected here.

Neither `58eaa6d95…f3ab7.gif` nor `Pixel_Key.gif` hashes to `58eaa…` or `1a0e1e52…` as `sha256sum` of the binary file.

Prologue name drift: **Alima** (pouch embroidery) ↔ **Aliya** (season chapters) — same pilgrim; preserve both in ARG metadata.

---

## Web4 publication (from `Inervention.txt`)

| Phase | Action | Bridgeworld repo |
|-------|--------|------------------|
| **1** | Static export → IPFS CID → bind `bridgeworld.nft` / `.ethermail` (UD) | `pnpm run deploy:ipfs`, `scripts/deploy-ipfs.mjs` |
| **2** | Covenant + SCROLL → Autonomys DSN | `pnpm run autonomys:store`, `memos/` encrypt pipeline |
| **3** | Triple host: DSN + Arweave + IPFS; H-line timestamps in observatory | `Covenant/⟐/observatory/` |

Cloudflare (`bridgeworld.lol`) = **Phase 0 bridge** (301 → Web3 resolution when ready), not the terminus.

---

## Fren metaverse (beginning)

Each connected wallet:

1. **`/fren`** — establish Fren ID (`address ⊕ COVENANT_PREFIX`).
2. **`/fren/:frenId`** — sovereign corner: invoke elves (Golem, Legion, etc.), append manifest log.
3. **Future** — MemOS backup per Fren, Autonomys agent memory, UD-hosted lander per `bridgeworld.ethermail`.

Puzzle completion = configuring contracts + keys + subgraph + Discord clues until the Den “opens” for the community.

---

## Research cross-links (read, don’t glob)

| Vault path | Feeds |
|------------|--------|
| `Treasure/Project/bridgeworld-season-1-aliyas-ascent/` | Season 1 canon text |
| `Inervention.txt` | Web4 phases, Harvester math, Shield pipeline, MemOS |
| `Shield_⟐_Pistis.js` | 22-node rotational hash, Syriac root authority |
| `3GDPP` | Web4 / 3gDPP material science + **Pixel_Key** chapter index |
| `Covenant/⟐/observatory/` | Celestial time / H-line coordination |
| `Cyber-Gnostic Systems Archeology` | Gnostic ↔ contract “garment” metaphor |

---

## Immediate checklist

- [x] Canonical `HuntressKey.gif` in `public/` (from `58eaa6d95…f3ab7.gif`)
- [x] Huntress Den gate on `/fren` — Tier 1 embroidery key + `/api/archivist/verify-access`
- [ ] Farcaster manifest: sign `accountAssociation` (currently `PENDING`)
- [ ] UD: `ud domains hosting` → IPFS CID after `deploy:ipfs`
- [ ] Link season markdown as in-app “Archives” (Huntress library, Ch.6)
