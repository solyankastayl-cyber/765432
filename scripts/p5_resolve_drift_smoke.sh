#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8002}"

echo "═══════════════════════════════════════════════════════════════"
echo "  P5 Cross-Asset Resolve & Drift Smoke Test"
echo "═══════════════════════════════════════════════════════════════"
echo "BASE_URL=$BASE"
echo

echo "== 1) Create composite snapshot for testing =="
curl -sS "$BASE/api/cross-asset/admin/lifecycle/promote?horizonDays=7" -X POST -H "content-type: application/json" -d '{}' | jq -c '{ok,versionId}'
curl -sS "$BASE/api/cross-asset/admin/lifecycle/promote?horizonDays=14" -X POST -H "content-type: application/json" -d '{}' | jq -c '{ok,versionId}'
curl -sS "$BASE/api/cross-asset/admin/lifecycle/promote?horizonDays=30" -X POST -H "content-type: application/json" -d '{}' | jq -c '{ok,versionId}'

echo
echo "== 2) Force resolve (simulates matured snapshot) =="
# Get the latest version
LATEST=$(curl -sS "$BASE/api/cross-asset/admin/lifecycle/status" | jq -r '.state.activeVersion')
echo "Latest version: $LATEST"

# Force resolve for 7d horizon (bypasses maturity check for testing)
curl -sS "$BASE/api/cross-asset/admin/lifecycle/force-resolve" \
  -X POST \
  -H "content-type: application/json" \
  -d "{\"versionId\":\"$LATEST\",\"horizonDays\":7}" | jq .

echo
echo "== 3) Run automatic resolve (mature snapshots only) =="
curl -sS "$BASE/api/cross-asset/admin/lifecycle/resolve" -X POST | jq .

echo
echo "== 4) Get overall drift =="
curl -sS "$BASE/api/cross-asset/admin/drift" | jq .

echo
echo "== 5) Get drift by version =="
curl -sS "$BASE/api/cross-asset/admin/drift/by-version" | jq '.versions[:3]'

echo
echo "== 6) Get drift by horizon =="
curl -sS "$BASE/api/cross-asset/admin/drift/by-horizon" | jq .

echo
echo "== 7) Get component attribution =="
curl -sS "$BASE/api/cross-asset/admin/drift/attribution" | jq .

echo
echo "== 8) Get weights diagnostics =="
curl -sS "$BASE/api/cross-asset/admin/drift/weights" | jq .

echo
echo "== 9) Get worst snapshots =="
curl -sS "$BASE/api/cross-asset/admin/drift/worst?limit=3" | jq .

echo
echo "== 10) Get best snapshots =="
curl -sS "$BASE/api/cross-asset/admin/drift/best?limit=3" | jq .

echo
echo "== 11) Verify audit invariants =="
curl -sS "$BASE/api/cross-asset/admin/audit/invariants" | jq '.audit.checks | {weightsSum, weightsBounded, noNaN}'

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  P5 Smoke Test Complete"
echo "═══════════════════════════════════════════════════════════════"
