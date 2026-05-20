# Bridgeworld.lol

Sovereign reconstruction of the Bridgeworld Cycles — deployed at **treasure.bridgeworld.lol**

Built from the canonical [TreasureProject](https://github.com/TreasureProject) stack by [theosmagic](https://github.com/theosmagic).

---

## Architecture

```
treasure.bridgeworld.lol
├── React Router 7 client  (app/)
├── Cloudflare Worker      (workers/app.ts)  — subgraph proxy, manifest, agent gateway
├── Cycle 1: Harvester staking contracts     (contracts/)
└── Cycle 2: MemOS + Golem AI agent          (memos/ + golem/)
```

```
Abstract Chain L2 (ZK Stack / EigenDA)
         │
         ▼
Cloudflare Worker ──── Graph Node (treasure-subgraphs)
         │
         ├── /api/subgraph    → subgraph proxy
         ├── /api/manifest    → ecosystem manifest
         ├── /api/agent/:id   → MemOS agent state (Arweave-backed)
         └── /agents/chat/:id → Golem WebSocket relay
```

---

## Cycles

### Cycle 1 — Harvester Staking

Effective mining power: `S_p = D_p × (1.0 + B_L + B_T)`

- `D_p` — base MAGIC deposit
- `B_L` — additive Legion boosts (Genesis Rare = 2.0 each)
- `B_T` — additive Treasure boosts (Honeycomb = 0.1578 each)

Harvester caps: 6,000,000 MAGIC · 40 parts/wallet · 500 parts/pool

Contracts from `ghoul-sol/treasure-staking` @ `c0840a4`, Solidity `^0.8.20`.

### Cycle 2 — MemOS + Golem

- **MemOS** — ChaCha20Poly1305 encrypted agent memory backed by Arweave
- **Golem** — Unity `CFConnector.cs` WebSocket bridge connecting characters to AI backend

---

## Stack

| Layer | Source |
|-------|--------|
| Frontend | `TreasureProject/web3-starter-template` (React Router 7 + viem/wagmi) |
| Edge gateway | Cloudflare Workers |
| Subgraph | `TreasureProject/treasure-subgraphs` |
| Cycle 1 contracts | `ghoul-sol/treasure-staking` @ `c0840a4` |
| Cycle 2 memory | `TreasureProject/MemOS` |
| Cycle 2 agent | Golem CFConnector protocol |
| Chain | Abstract Chain (2741) + Arbitrum (42161) |

---

## Setup

```bash
pnpm install && pnpm dev

# Deploy
pnpm run build:production
npx wrangler deploy --env production
```

### Cycle 1 contracts (Foundry)

```bash
forge install OpenZeppelin/openzeppelin-contracts@v4.9.0 --no-commit
forge build --optimize --optimizer-runs 200
forge script contracts/script/DeployCycle1.s.sol:DeployScript \
  --rpc-url http://system76.ht.local:3060 \
  --private-key $ETH_PRIVATE_KEY --broadcast
```

### MemOS (Cycle 2)

```bash
cd memos && pip install -r requirements.txt
export ETH_PRIVATE_KEY="0x..."
python memos.py backup --input memory/
```

---

## Identity

- **ABOVE**: `theosmagic.base.eth` · `bridgeworld.nft` · `bridgeworld@ethermail.io`
- **WITHIN**: Covenant MCP @ `system76.ht.local:8010`
- **BELOW**: YubiKey PIV P-256 · `system76.ht.local`