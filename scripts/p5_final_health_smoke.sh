#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8002}"

echo "═══════════════════════════════════════════════════════════════"
echo "  P5-FINAL: Auto-Resolve, Drift Guard, Health Smoke Test"
echo "═══════════════════════════════════════════════════════════════"
echo "BASE_URL=$BASE"
echo

echo "== 1) List available jobs =="
curl -sS "$BASE/api/admin/jobs/list" | jq .

echo
echo "== 2) Run resolve_matured job =="
curl -sS "$BASE/api/admin/jobs/run?job=resolve_matured" -X POST | jq '{ok, totalResolved: .result.totalResolved, totalSkipped: .result.totalSkipped, errors: (.result.errors | length)}'

echo
echo "== 3) Run health_check job =="
curl -sS "$BASE/api/admin/jobs/run?job=health_check" -X POST | jq '.results'

echo
echo "== 4) Get health status (all scopes) =="
curl -sS "$BASE/api/admin/health/status" | jq '{summary: .summary, states: [.states[] | {scope, grade, sampleCount: .metrics.sampleCount, hitRate: .metrics.hitRate}]}'

echo
echo "== 5) Get health for specific scope (BTC) =="
curl -sS "$BASE/api/admin/health/status?scope=BTC" | jq '.state | {grade, reasons, metrics: {hitRate, sampleCount, avgAbsError}}'

echo
echo "== 6) Check if governance frozen (BTC) =="
curl -sS "$BASE/api/admin/health/frozen?scope=BTC" | jq .

echo
echo "== 7) Run full job (resolve + health) =="
curl -sS "$BASE/api/admin/jobs/run?job=full" -X POST | jq '{ok, resolve: .resolve, health: .health}'

echo
echo "== 8) Test governance freeze (should work if HEALTHY) =="
curl -sS "$BASE/api/fractal/v2.1/admin/governance/model-config?asset=BTC" \
  -X POST \
  -H "content-type: application/json" \
  -d '{"windowLen": 60}' | jq '{ok, error}'

echo
echo "═══════════════════════════════════════════════════════════════"
echo "  P5-FINAL Smoke Test Complete"
echo "═══════════════════════════════════════════════════════════════"
