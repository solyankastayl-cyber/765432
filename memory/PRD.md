# Fractal Platform PRD v2.0

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/345678trew
P3-A: SPX Lifecycle Integration
P3-B: DXY Lifecycle Integration
Governance Standard согласно PRD v2.0

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: model_config, model_lifecycle_state, model_lifecycle_events, prediction_snapshots, decision_outcomes

## User Personas
1. **Trader** - Использует прогнозы для торговых решений
2. **Analyst** - Изучает исторические паттерны и точность модели
3. **Admin** - Управляет системой через Admin Panel и Governance

## Core Requirements (Static)
1. PRD v2.0 Governance Standard
2. Lifecycle: Version → Snapshot → Resolve → Outcome → Drift
3. Runtime-configurable engine параметры через MongoDB
4. Version isolation для snapshots и outcomes

## What's Been Implemented

### Session 1 (2026-03-02) - Full Deployment
- Склонирован репозиторий, установлены зависимости
- Все сервисы запущены (backend, frontend, MongoDB)
- BTC/SPX/DXY страницы работают
- Testing: 100% pass rate

### Session 2 (2026-03-02) - P3-A SPX Lifecycle
- Добавлены SPX-специфичные параметры в ModelConfigDoc:
  - consensusThreshold (default: 0.05)
  - divergencePenalty (default: 0.85)
- Runtime-config интеграция в spx-focus-pack.builder.ts
- SPX focus-pack теперь читает windowLen/topK из MongoDB
- SPX consensus service поддерживает runtime threshold
- Promote создаёт версии для SPX
- Testing: 100% pass rate (5/5 SPX tests)

### Session 2 (2026-03-02) - P3-B DXY Lifecycle  
- Добавлены DXY-специфичные параметры:
  - syntheticWeight (default: 0.4)
  - replayWeight (default: 0.4)
  - macroWeight (default: 0.2)
- DXY promote создаёт версии
- DXY terminal возвращает synthetic path
- Testing: 100% pass rate (3/3 DXY tests)

## API Endpoints (P3)

### Model Config
- `POST /api/fractal/v2.1/admin/governance/model-config` - Update config (accepts asset in body)
- `GET /api/fractal/v2.1/admin/governance/model-config?asset=X` - Get config
- `GET /api/fractal/v2.1/admin/governance/runtime-debug?asset=X` - Debug info

### Lifecycle
- `POST /api/fractal/v2.1/admin/lifecycle/promote` - Create version + snapshots
- `POST /api/fractal/v2.1/admin/lifecycle/resolve` - Resolve snapshots → outcomes
- `POST /api/fractal/v2.1/admin/lifecycle/rollback` - Rollback to previous version
- `GET /api/fractal/v2.1/admin/lifecycle/status?asset=X` - Get lifecycle state

### Public Endpoints
- `GET /api/spx/v2.1/focus-pack?horizon=X` - SPX focus pack (runtime config aware)
- `GET /api/fractal/dxy/terminal?focus=X` - DXY terminal (runtime config aware)

## Smoke Test Scripts
- `/app/scripts/p3_spx_lifecycle_smoke.sh` - SPX lifecycle test
- `/app/scripts/p3_dxy_lifecycle_smoke.sh` - DXY lifecycle test

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта
- [x] P3-A SPX Lifecycle Integration
- [x] P3-B DXY Lifecycle Integration

### P1 (High Priority) - Next Phase
- [ ] P4: Cross-Asset Composite Governance
  - parentVersionIds
  - composite snapshot
  - composite resolve
  - portfolio drift
- [ ] Governance UI в Admin Panel

### P2 (Medium Priority)
- [ ] Snapshot comparison
- [ ] Divergence tracking
- [ ] Attribution dashboard

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Alert system integration

## Next Tasks
1. P4: Cross-Asset Lifecycle (BTC+SPX+DXY)
2. Admin Panel Governance UI
3. Drift/Attribution visualization
