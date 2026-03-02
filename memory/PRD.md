# Fractal Platform PRD v2.0

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/345678trew
P3-A: SPX Lifecycle Integration
P3-B: DXY Lifecycle Integration  
P4: Cross-Asset Composite Lifecycle
Governance Standard согласно PRD v2.0

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: model_config, model_lifecycle_state, model_lifecycle_events, prediction_snapshots, composite_snapshots, decision_outcomes

## Core Requirements (PRD v2.0 Governance Standard)
1. Lifecycle: Version → Snapshot → Resolve → Outcome → Drift
2. Runtime-configurable engine параметры через MongoDB
3. Version isolation для snapshots и outcomes
4. Composite = deterministic blend от parent versions

## What's Been Implemented

### Session 1 - Full Deployment
- Склонирован репозиторий, установлены зависимости
- BTC/SPX/DXY страницы работают
- Testing: 100% pass rate

### Session 2 - P3-A SPX Lifecycle
- Runtime-configurable: windowLen, topK, consensusThreshold, divergencePenalty
- SPX focus-pack читает config из MongoDB (configSource: "mongo")
- Testing: 100% pass rate

### Session 2 - P3-B DXY Lifecycle  
- Runtime-configurable: syntheticWeight, replayWeight, macroWeight
- DXY terminal возвращает synthetic path с bands
- Testing: 100% pass rate

### Session 3 - P4 Cross-Asset Composite Lifecycle
- **Smart Composite** с vol-adjusted weights и confidence weighting
- Composite = f(BTC version, SPX version, DXY version)
- **parentVersions** immutable после создания
- **Weights bounded** [0.05, 0.90] с iterative clamping
- Vol penalties применяются (высокая volatility → меньший вес)
- Confidence factors применяются
- Audit invariants проверяет корректность composite

## API Endpoints (P4 Cross-Asset)

### Composite Lifecycle
- `POST /api/cross-asset/admin/lifecycle/promote` - Create composite version
- `POST /api/cross-asset/admin/lifecycle/rollback` - Rollback to previous
- `GET /api/cross-asset/admin/lifecycle/status` - Lifecycle status

### Composite Data  
- `GET /api/cross-asset/snapshot` - Get composite forecast
- `GET /api/cross-asset/config` - Default blend config

### Audit
- `GET /api/cross-asset/admin/audit/invariants` - Validate composite invariants

## Composite Smart Weights Formula

```
rawWeight_a = baseWeight_a * volPenalty_a * confFactor_a

volPenalty_a = 1 / (1 + (sigma_a / sigma_ref)^p)
confFactor_a = clip(0.15 + 0.85 * confidence_a)

finalWeight_a = normalize(rawWeight_a) with bounds [0.05, 0.90]
```

## Smoke Test Scripts
- `/app/scripts/p3_spx_lifecycle_smoke.sh`
- `/app/scripts/p3_dxy_lifecycle_smoke.sh`
- `/app/scripts/p4_cross_asset_lifecycle_smoke.sh`

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта
- [x] P3-A SPX Lifecycle Integration
- [x] P3-B DXY Lifecycle Integration
- [x] P4 Cross-Asset Composite Lifecycle

### P1 (High Priority) - Next Phase
- [ ] Governance UI в Admin Panel для управления blend config
- [ ] Composite resolve service (outcomes)
- [ ] Cross-asset drift calculation

### P2 (Medium Priority)
- [ ] Snapshot comparison view
- [ ] Attribution dashboard
- [ ] Performance visualization

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Alert system integration
- [ ] Historical composite replay

## Next Tasks
1. Admin Panel UI для Composite governance (blend weights)
2. Composite resolve для outcomes
3. Cross-asset drift/attribution visualization
