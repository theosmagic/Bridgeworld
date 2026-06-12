# Bridgeworld Deployment & Indexer Guide

## Local Development with Indexer Stack

**Use Docker Desktop backend** (not the remote `DOCKER_HOST` in `~/.zshrc`):

```bash
./scripts/indexer-up.sh
```

This uses context `desktop-linux`, `docker pass` (`se://`) for Postgres creds, and `init: true` on services. Secrets live in Docker Desktop’s keychain:

```bash
docker --context desktop-linux pass set bridgeworld/postgres/password=your-secret
docker --context desktop-linux pass ls
```

Optional **addons** profile (local Hardhat/Anvil RPC proxy on `:8545` inside the compose network):

```bash
COMPOSE_PROFILES=addons ./scripts/indexer-up.sh
```

Plain compose (any context):

```bash
docker --context desktop-linux compose up -d
```

This runs:
- **Graph Node** on `:8000` (GraphQL endpoint at `http://localhost:8000/subgraphs/name/bridgeworld`)
- **PostgreSQL** on `:5432` (user: `graph-node` / pass: `graph-node`)
- **IPFS** on `:5001` (API) and `:8081` (gateway; host `8080` often reserved)
- **Prometheus** (optional; enable with `--profile monitoring`)

Verify health:
```bash
curl http://localhost:8000/graphql?query={_meta{block{number}}}
```

Stop:
```bash
docker compose down
```

Clean volumes (reset indexer state):
```bash
docker compose down -v
```

---

## Bridgeworld Portal Deployment

### Prerequisites
- Node.js 20+ (required by wrangler)
- pnpm 10.16.1
- Cloudflare account + API token

### Staging Deployment

Build and deploy to `staging.treasure.bridgeworld.lol`:

```bash
pnpm install
pnpm run build:staging
pnpm run deploy:staging
```

Verify:
```bash
curl https://staging.treasure.bridgeworld.lol/
```

### Production Deployment

Build and deploy to `treasure.bridgeworld.lol`:

```bash
pnpm run build:production
pnpm run deploy:production
```

This pushes the Cloudflare Worker + React Router SSR bundle to the edge.

---

## Architecture

```
treasure.bridgeworld.lol (Cloudflare Worker Edge)
  ├── React Router 7 SSR (app/)
  ├── Subgraph proxy (/api/subgraph → Graph Node)
  ├── Manifest gateway (/api/manifest)
  └── Agent state (/api/agent/:id → Arweave)

Graph Node (localhost:8000 or Docker)
  ├── PostgreSQL (persistence)
  ├── IPFS (block data)
  └── RPC endpoints (Abstract L2, Base, Ethereum)

Contracts (Foundry)
  ├── Cycle 1: Harvester staking (0.8.13)
  └── Cycle 2: MemOS + Golem (0.8.20)
```

---

## Contract Builds

### Cycle 1 (Harvester)
```bash
FOUNDRY_PROFILE=cycle1 forge build
```

### Cycle 2 (Diamond + Facets)
```bash
FOUNDRY_PROFILE=diamond forge build
forge script contracts/script/DeployCycle2.s.sol:DeployScript \
  --rpc-url https://api.mainnet.abs.xyz \
  --private-key $ETH_PRIVATE_KEY --broadcast
```

---

## Subgraph Deployment (The Graph)

If using a hosted subgraph:

```bash
cd ../treasure-subgraphs  # from Treasure project
graph deploy --node https://api.thegraph.com/deploy/ bridgeworld/treasure-subgraph
```

For local Graph Node:
```bash
graph deploy --node http://localhost:18020 bridgeworld/treasure-subgraph
```

---

## Covenant Verification

Before any production deployment:

```bash
pnpm run covenant:stack
pnpm run covenant:witness
```

This validates:
- Bridgeworld covenant MCP @ system76.ht.local:8010
- Master Key + witness signatures
- Cycle 1 contract compilation (timestamp warnings only)

---

## Environment Variables

### Staging (`.env.staging`)
```
CLOUDFLARE_ENV=staging
PUBLIC_ENVIRONMENT=staging
SUBGRAPH_API_URL=http://system76.ht.local:8000/subgraphs/name/bridgeworld
```

### Production (`.env.production`)
```
CLOUDFLARE_ENV=production
PUBLIC_ENVIRONMENT=production
SUBGRAPH_API_URL=https://api.goldsky.com/...  # or self-hosted Graph Node
```

### Secrets (wrangler)
```bash
wrangler secret put SUBGRAPH_API_URL --env production
wrangler secret put ETH_PRIVATE_KEY
```

---

## Docker + Wrangler Integration

To deploy from a container:

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm wrangler
COPY pnpm-lock.yaml .
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:staging
CMD ["wrangler", "deploy", "--env", "staging"]
```

Build and run:
```bash
docker build -t bridgeworld-deploy .
docker run --env CLOUDFLARE_API_TOKEN=... bridgeworld-deploy
```

---

## Monitoring

Enable Prometheus monitoring (Graph Node metrics on `:9090`):

```bash
docker compose --profile monitoring up -d prometheus
curl http://localhost:9090/metrics
```

---

## Troubleshooting

**Graph Node fails to start:**
```bash
docker compose logs graph-node
docker compose ps
```

**Subgraph not indexing:**
- Check RPC endpoint in `wrangler.jsonc`
- Verify PostgreSQL connection: `docker compose exec postgres psql -U graph-node -d graph-node`
- View Graph Node logs: `docker compose logs -f graph-node`

**Portal build fails:**
- Ensure Node 20+: `node --version`
- Clear pnpm cache: `pnpm store prune`
- Rebuild: `pnpm install && pnpm run build:staging`

**Wrangler deployment fails:**
- Check Cloudflare API token: `wrangler whoami`
- Verify account ID in `wrangler.jsonc`
- View deployment logs: `wrangler tail --env staging`

---

## Next Steps

1. **Deploy staging** → confirm vite symlink fixes work on CF edge
2. **Set up CI/CD** → GitHub Actions to auto-deploy on main branch push
3. **Enable Prometheus** → monitor Graph Node indexing performance
4. **Test multi-chain** → verify Abstract L2 + Base RPC endpoints
5. **Archive to Autonomys** → `pnpm run autonomys:store` for Covenant records
