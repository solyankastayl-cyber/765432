#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8002}"
ASSET="DXY"

echo "== P3-B DXY Lifecycle Smoke Test =="
echo

echo "1) Health"
curl -sS "$BASE_URL/api/health" | jq .

echo
echo "2) Set DXY runtime config"

curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/governance/model-config" \
  -H "content-type: application/json" \
  -d '{
    "asset":"DXY",
    "windowLen":90,
    "topK":15,
    "minGapDays":60,
    "similarityMode":"zscore",
    "syntheticWeight":0.4,
    "replayWeight":0.4,
    "macroWeight":0.2,
    "divergencePenalty":0.9
  }' | jq .

echo
echo "3) Runtime debug"

curl -sS "$BASE_URL/api/fractal/v2.1/admin/governance/runtime-debug?asset=$ASSET" | jq .

echo
echo "4) Promote DXY"

PROMOTE_RES="$(curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/lifecycle/promote" \
  -H "content-type: application/json" \
  -d "{\"asset\":\"$ASSET\",\"reason\":\"P3-B smoke promote\"}")"

echo "$PROMOTE_RES" | jq .

VERSION_ID="$(echo "$PROMOTE_RES" | jq -r '.activeVersion // .versionId // .version // empty')"

if [[ -z "${VERSION_ID:-}" || "$VERSION_ID" == "null" ]]; then
  echo "ERROR: cannot extract VERSION_ID"
  exit 1
fi

echo
echo "Active version: $VERSION_ID"

echo
echo "5) Public DXY terminal"

curl -sS "$BASE_URL/api/fractal/dxy/terminal?focus=90d" | jq '.'

echo
echo "6) Resolve"

curl -sS -X POST "$BASE_URL/api/fractal/v2.1/admin/lifecycle/resolve" \
  -H "content-type: application/json" \
  -d "{\"asset\":\"$ASSET\",\"versionId\":\"$VERSION_ID\"}" | jq .

echo
echo "7) Outcomes"

curl -sS "$BASE_URL/api/fractal/v2.1/admin/lifecycle/outcomes?asset=$ASSET&versionId=$VERSION_ID" | jq .

echo
echo "DONE P3-B DXY Lifecycle Smoke Test"
