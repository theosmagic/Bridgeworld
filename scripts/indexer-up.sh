#!/usr/bin/env bash
# Run Bridgeworld indexer on Docker Desktop (pass backend, host.docker.internal, addons).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CTX="${DOCKER_CONTEXT:-desktop-linux}"
PROFILE="${COMPOSE_PROFILES:-}"

# Seed dev secrets if missing (docker pass keychain — not gpg pass)
docker --context "$CTX" pass set bridgeworld/postgres/user=graph-node 2>/dev/null || true
docker --context "$CTX" pass set bridgeworld/postgres/password=graph-node 2>/dev/null || true

ARGS=(--context "$CTX" compose up -d)
if [[ -n "$PROFILE" ]]; then
  export COMPOSE_PROFILES="$PROFILE"
fi

echo "Using Docker context: $CTX"
exec docker "${ARGS[@]}" "$@"
