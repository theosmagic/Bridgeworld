#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CTX="${DOCKER_CONTEXT:-desktop-linux}"

# Covenant gate
bash ../Covenant/verify-covenant.sh

# Cloudflare auth from docker pass (Desktop keychain)
export CLOUDFLARE_EMAIL="$(docker --context "$CTX" pass get bridgeworld/cloudflare/email)"
export CLOUDFLARE_API_KEY="$(docker --context "$CTX" pass get bridgeworld/cloudflare/api-key)"
export CLOUDFLARE_ACCOUNT_ID="$(docker --context "$CTX" pass get bridgeworld/cloudflare/account-id)"

pnpm install --frozen-lockfile
pnpm run build:staging
pnpm run deploy:staging

echo "Deployed staging — verify: curl -f https://staging.treasure.bridgeworld.lol/"
