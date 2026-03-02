#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8002}"
ASSET="SPX"

HORIZONS=("7d" "14d" "30d" "90d" "180d" "365d")

echo "== P3-A SPX Lifecycle Smoke Test =="
echo "BASE_URL=$BASE_URL"
echo

echo "1) Health check"
curl -sS "$BASE_URL/api/health" | jq .

echo
echo "2) Set SPX runtime config (Mongo-backed)"
curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/governance/model-config" \
  -H "content-type: application/json" \
  -d '{
    "asset":"SPX",
    "windowLen": 90,
    "topK": 15,
    "minGapDays": 60,
    "similarityMode":"zscore",
    "horizonWeights":{"7d":0.15,"14d":0.20,"30d":0.35,"90d":0.30},
    "consensusThreshold": 0.05,
    "divergencePenalty": 0.85
  }' | jq .

echo
echo "3) Runtime debug (must show configSource=mongo)"
curl -sS "$BASE_URL/api/fractal/v2.1/admin/governance/runtime-debug?asset=$ASSET" | jq .

echo
echo "4) Promote SPX (creates version + snapshots)"
PROMOTE_RES="$(curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/lifecycle/promote" \
  -H "content-type: application/json" \
  -d "{\"asset\":\"$ASSET\",\"reason\":\"P3-A smoke promote\"}")"

echo "$PROMOTE_RES" | jq .
VERSION_ID="$(echo "$PROMOTE_RES" | jq -r '.activeVersion // .versionId // .version // .data.activeVersion // empty')"

if [[ -z "${VERSION_ID:-}" || "$VERSION_ID" == "null" ]]; then
  echo "ERROR: could not extract VERSION_ID from promote response"
  exit 1
fi

echo
echo "Active version: $VERSION_ID"

echo
echo "5) Public SPX focus-pack must reflect runtime config (windowLen/topK etc.)"
curl -sS "$BASE_URL/api/spx/v2.1/focus-pack?horizon=90d" | jq '.data.meta | {symbol,focus,windowLen,topK,configSource,modelVersion}'

echo
echo "6) Resolve matured snapshots"
curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/lifecycle/resolve" \
  -H "content-type: application/json" \
  -d "{\"asset\":\"$ASSET\",\"versionId\":\"$VERSION_ID\"}" | jq .

echo
echo "7) Fetch outcomes stats"
curl -sS "$BASE_URL/api/fractal/v2.1/admin/lifecycle/outcomes?asset=$ASSET&versionId=$VERSION_ID" | jq .

echo
echo "8) Quick status"
curl -sS "$BASE_URL/api/fractal/v2.1/admin/lifecycle/status?asset=$ASSET" | jq .

echo
echo "DONE P3-A SPX Lifecycle Smoke Test"
