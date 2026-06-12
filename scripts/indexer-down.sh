#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
CTX="${DOCKER_CONTEXT:-desktop-linux}"
exec docker --context "$CTX" compose down "$@"
