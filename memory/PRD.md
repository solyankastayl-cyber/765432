# Fractal Platform PRD v2.0 - Production Ready

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория
Multi-asset versioned lifecycle с self-monitoring

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)

## What's Been Implemented (Complete)

### P3: SPX & DXY Lifecycle
- Runtime-configurable engine parameters
- Version-scoped snapshots
- Promote/Resolve/Rollback

### P4: Cross-Asset Composite  
- Smart composite с vol-adjusted weights
- parentVersions lineage tracking
- Weights bounded [0.05, 0.90]

### P5-A: Composite Resolve
- Auto-resolve matured snapshots → outcomes
- Version isolated, parent lineage preserved
- Idempotent, no-lookahead

### P5-B: Drift Dashboard
- hitRate, avgError, avgAbsError, p50/p90
- Per version, per horizon metrics
- Component attribution, weights diagnostics

### P5-FINAL: Production-Grade Self-Monitoring

#### A) Auto-Resolve Scheduler
- `POST /api/admin/jobs/run?job=resolve_matured`
- Resolves BTC/SPX/DXY/CROSS_ASSET automatically
- Idempotent (repeated runs = 0 new outcomes)

#### B) Drift Guard (Health Grades)
- Grades: HEALTHY | DEGRADED | CRITICAL
- Thresholds: hitRate < 45% → DEGRADED, < 35% → CRITICAL
- INSUFFICIENT_SAMPLES gate (sampleCount < 10)
- Consecutive degraded windows tracking

#### C) Governance Freeze
- CRITICAL health → blocks config updates and promote
- Force override with `force=true` (logged)
- Endpoint: `GET /api/admin/health/frozen?scope=X`

## API Endpoints (P5-FINAL)

### Jobs
- `POST /api/admin/jobs/run?job=resolve_matured` - Auto-resolve all assets
- `POST /api/admin/jobs/run?job=health_check` - Recompute health grades
- `POST /api/admin/jobs/run?job=full` - Resolve + Health check
- `GET /api/admin/jobs/list` - Available jobs

### Health
- `GET /api/admin/health/status` - All scopes health
- `GET /api/admin/health/status?scope=X` - Specific scope
- `POST /api/admin/health/recompute` - Recompute grades
- `GET /api/admin/health/frozen?scope=X` - Check governance freeze

## Health Thresholds (Configurable)
```javascript
{
  minSamplesForGrading: 10,
  minSamplesForCritical: 20,
  hitRateDegraded: 0.45,     // 45%
  hitRateCritical: 0.35,     // 35%
  avgAbsErrorDegraded: 5.0,  // 5%
  avgAbsErrorCritical: 10.0, // 10%
  consecutiveWindowsForCritical: 3
}
```

## Production Ready Definition ✓
- [x] Resolve автоматический
- [x] Drift виден (hitRate, avgError, sampleCount)
- [x] Health grades (HEALTHY/DEGRADED/CRITICAL)
- [x] Governance freeze при CRITICAL
- [x] Force override с логированием
- [x] Version isolation
- [x] Composite lineage preserved

## Smoke Test Scripts
- `/app/scripts/p3_spx_lifecycle_smoke.sh`
- `/app/scripts/p3_dxy_lifecycle_smoke.sh`
- `/app/scripts/p4_cross_asset_lifecycle_smoke.sh`
- `/app/scripts/p5_resolve_drift_smoke.sh`
- `/app/scripts/p5_final_health_smoke.sh`

## Next Steps (Post-MVP)
1. Confidence Adjustment Layer (finalConfidence = base × driftModifier)
2. Health Dashboard UI в Admin Panel
3. Auto-resolve scheduler (cron every 6 hours)
4. Alert thresholds (Slack/email when DEGRADED)
5. Historical health trends visualization

## Architecture Philosophy
> Сильная модель = не та, что предсказывает идеально,
> а та, что знает, когда она начинает ошибаться.
