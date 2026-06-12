#!/usr/bin/env bash
# Ping Snowflake REST API for SAM-style accounts (org-account UUID).
# Requires SNOWFLAKE_PAT and SNOWFLAKE_ACCOUNT (e.g. SAM-390cc0a6-bbd1-4390-940e-98de8d4ec91f).
set -euo pipefail

ACCOUNT="${SNOWFLAKE_ACCOUNT:-SAM-390cc0a6-bbd1-4390-940e-98de8d4ec91f}"
PAT="${SNOWFLAKE_PAT:-}"

if [[ -z "${PAT}" ]]; then
  echo "SNOWFLAKE_PAT not set — skipping SAM API ping"
  exit 0
fi

HOST="$(echo "${ACCOUNT}" | tr '[:upper:]' '[:lower:]').snowflakecomputing.com"
URL="https://${HOST}/api/v2/statements"

echo "Snowflake SAM API: ${URL}"

HTTP_CODE="$(curl -sS -o /tmp/sf-sam-response.json -w "%{http_code}" \
  -X POST "${URL}" \
  -H "Authorization: Bearer ${PAT}" \
  -H "X-Snowflake-Authorization-Token-Type: PROGRAMMATIC_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"statement":"SELECT CURRENT_USER(), CURRENT_ACCOUNT()","timeout":30,"database":"","schema":"","warehouse":"","role":""}' \
  || echo "000")"

if [[ "${HTTP_CODE}" =~ ^2 ]]; then
  echo "SAM API OK (${HTTP_CODE})"
  head -c 500 /tmp/sf-sam-response.json
  echo
  exit 0
fi

echo "SAM API returned HTTP ${HTTP_CODE} (CoCo trial accounts may not expose snowflakecomputing.com yet)"
cat /tmp/sf-sam-response.json 2>/dev/null | head -c 300 || true
echo
exit 0
