# Fractal Platform PRD v2.0

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория
P3-A: SPX Lifecycle Integration
P3-B: DXY Lifecycle Integration  
P4: Cross-Asset Composite Lifecycle
P5-A: Composite Resolve Service
P5-B: Drift Dashboard
Governance Standard согласно PRD v2.0

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: model_config, model_lifecycle_state, model_lifecycle_events, prediction_snapshots, composite_snapshots, decision_outcomes

## What's Been Implemented

### P3-A/P3-B: SPX & DXY Lifecycle (Complete)
- Runtime-configurable engine parameters
- Version-scoped snapshots
- Promote/Resolve/Rollback working

### P4: Cross-Asset Composite (Complete)
- Smart composite с vol-adjusted weights
- parentVersions lineage tracking
- Weights bounded [0.05, 0.90]
- Audit invariants

### P5-A: Composite Resolve (Complete)
- Resolves matured snapshots into decision_outcomes
- Calculates realized return from actual parent returns (BTC/SPX/DXY)
- Version isolated outcomes
- Parent lineage preserved in outcomes
- Idempotent (no duplicates)
- No-lookahead (candles ≤ maturityAt)
- Force-resolve for testing

### P5-B: Drift Dashboard (Complete)
- Overall drift metrics (hitRate, avgError, avgAbsError, p50/p90)
- Drift per version
- Drift per horizon (7d, 14d, 30d, 90d)
- Component attribution (BTC/SPX/DXY contributions)
- Weights diagnostics (min/max/clamped count)
- Worst/Best snapshots endpoints

## API Endpoints (P5)

### Resolve
- `POST /api/cross-asset/admin/lifecycle/resolve` - Resolve all mature snapshots
- `POST /api/cross-asset/admin/lifecycle/force-resolve` - Force resolve (testing)

### Drift
- `GET /api/cross-asset/admin/drift` - Overall drift metrics
- `GET /api/cross-asset/admin/drift/by-version` - Per version
- `GET /api/cross-asset/admin/drift/by-horizon` - Per horizon
- `GET /api/cross-asset/admin/drift/attribution` - Component attribution
- `GET /api/cross-asset/admin/drift/weights` - Weights diagnostics
- `GET /api/cross-asset/admin/drift/worst` - Worst snapshots
- `GET /api/cross-asset/admin/drift/best` - Best snapshots

## Smoke Test Scripts
- `/app/scripts/p3_spx_lifecycle_smoke.sh`
- `/app/scripts/p3_dxy_lifecycle_smoke.sh`
- `/app/scripts/p4_cross_asset_lifecycle_smoke.sh`
- `/app/scripts/p5_resolve_drift_smoke.sh`

## Definition of Production Ready

Composite считается production-ready когда:
- [x] resolve работает (outcomes создаются)
- [x] drift не нулевой (sampleCount > 0)
- [x] governance влияет только через promote
- [x] rollback безопасен
- [x] все инварианты проходят audit endpoint

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] P3-A SPX Lifecycle
- [x] P3-B DXY Lifecycle
- [x] P4 Cross-Asset Composite
- [x] P5-A Composite Resolve
- [x] P5-B Drift Dashboard

### P1 (High Priority) - Next Phase
- [ ] P5-C: Governance UI (Admin Panel UI for blend config)
- [ ] Drift visualization charts
- [ ] Auto-resolve scheduler (cron job)

### P2 (Medium Priority)
- [ ] Snapshot comparison view
- [ ] Historical composite replay
- [ ] Performance alerts

## Next Tasks
1. P5-C: Admin Panel UI для управления composite blend config
2. Drift visualization (charts)
3. Auto-resolve scheduler
