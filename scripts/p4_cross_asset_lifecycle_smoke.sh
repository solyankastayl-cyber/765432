#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8002}"

echo "═══════════════════════════════════════════════════════════════"
echo "  P4 Cross-Asset Composite Lifecycle Smoke Test"
echo "═══════════════════════════════════════════════════════════════"
echo "BASE_URL=$BASE"
echo

echo "== 1) Promote BTC/SPX/DXY =="
echo "Promoting BTC..."
curl -sS -X POST "$BASE/api/fractal/v2.1/admin/lifecycle/promote" \
  -H "content-type: application/json" \
  -d '{"asset":"BTC","reason":"P4 smoke"}' | jq -c '{ok,version}'

echo "Promoting SPX..."
curl -sS -X POST "$BASE/api/fractal/v2.1/admin/lifecycle/promote" \
  -H "content-type: application/json" \
  -d '{"asset":"SPX","reason":"P4 smoke"}' | jq -c '{ok,version}'

echo "Promoting DXY..."
curl -sS -X POST "$BASE/api/fractal/v2.1/admin/lifecycle/promote" \
  -H "content-type: application/json" \
  -d '{"asset":"DXY","reason":"P4 smoke"}' | jq -c '{ok,version}'

echo
echo "== 2) Promote CROSS_ASSET horizon=90 =="
COMPOSITE_RES=$(curl -sS -X POST "$BASE/api/cross-asset/admin/lifecycle/promote?horizonDays=90" \
  -H "content-type: application/json" \
  -d '{}')

echo "$COMPOSITE_RES" | jq .

COMPOSITE_VERSION=$(echo "$COMPOSITE_RES" | jq -r '.versionId // empty')
if [[ -z "$COMPOSITE_VERSION" || "$COMPOSITE_VERSION" == "null" ]]; then
  echo "ERROR: Failed to create composite version"
  exit 1
fi
echo "Composite version: $COMPOSITE_VERSION"

echo
echo "== 3) Read CROSS_ASSET status =="
curl -sS "$BASE/api/cross-asset/admin/lifecycle/status" | jq '{
  state: .state,
  weights: .latestSnapshot.computedWeights,
  expectedReturn: .latestSnapshot.expectedReturn,
  stance: .latestSnapshot.stance
}'

echo
echo "== 4) Read CROSS_ASSET snapshot (public) =="
curl -sS "$BASE/api/cross-asset/snapshot?horizonDays=90" | jq '{
  ok,
  versionId,
  parentVersions,
  weights: .weights,
  expectedReturn: .forecast.expectedReturn,
  pathLength: (.forecast.path | length)
}'

echo
echo "== 5) Audit invariants =="
curl -sS "$BASE/api/cross-asset/admin/audit/invariants" | jq '{
  ok: .ok,
  weightsSum: .audit.checks.weightsSum,
  weightsBounded: .audit.checks.weightsBounded,
  dailyReturnCapped: .audit.checks.dailyReturnCapped
}'

echo
echo "== 6) Rollback SPX then promote CROSS_ASSET again =="
echo "Rolling back SPX..."
curl -sS -X POST "$BASE/api/fractal/v2.1/admin/lifecycle/rollback" \
  -H "content-type: application/json" \
  -d '{"asset":"SPX","reason":"P4 test rollback"}' | jq -c '{ok}'

echo "Promoting new CROSS_ASSET (should have different parentVersions)..."
curl -sS -X POST "$BASE/api/cross-asset/admin/lifecycle/promote?horizonDays=90" \
  -H "content-type: application/json" | jq -c '{ok,versionId,parentVersions}'

echo
echo "== 7) Verify original composite unchanged =="
curl -sS "$BASE/api/cross-asset/snapshot?horizonDays=90&versionId=$COMPOSITE_VERSION" | jq '{
  ok,
  versionId,
  parentVersions,
  note: "Should show ORIGINAL parentVersions (immutable)"
}'

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  P4 Cross-Asset Smoke Test Complete ✅"
echo "═══════════════════════════════════════════════════════════════"
