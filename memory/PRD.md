# Fractal Platform PRD v2.0

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/345678trew
Модули: BTC Fractal, SPX Fractal, DXY Terminal, Admin Panel
API ключ для macro (FRED): 2c0bf55cfd182a3a4d2e4fd017a622f7
Акцент на админке и Lifecycle система (PRD v2.0 - Governance Standard)

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: prediction_snapshots, fractal_canonical_ohlcv, spx_candles, dxy_candles, model_config, model_lifecycle_state, model_lifecycle_events

## User Personas
1. **Trader** - Использует прогнозы для торговых решений
2. **Analyst** - Изучает исторические паттерны и точность модели
3. **Admin** - Управляет системой через Admin Panel и Governance

## Core Requirements (Static)
1. История всех активов начинается с FIXED_HISTORY_START = 2026-01-01
2. Формат серии: [history] → anchor → [forecast]
3. anchorIndex корректно рассчитывается и сохраняется
4. Все горизонты поддерживаются: 7d, 14d, 30d, 90d, 180d, 365d
5. Overview читает ТОЛЬКО из prediction_snapshots (READ-ONLY)
6. Lifecycle Standard: Version → Snapshot → Resolve → Outcome → Drift

## PRD v2.0 - Governance Standard

### Versioning Standard
- Version = Immutable Config Snapshot
- Version никогда не редактируется
- Rollback не удаляет версию — только меняет activeVersion

### Snapshot Standard
- snapshot immutable
- resolve не меняет forecastPath
- snapshot всегда привязан к version

### Outcome Standard
- error = realizedReturn - expectedReturn
- predictedDirection = sign(expectedReturn)
- hit = predictedDirection == actualDirection

### Rollback Standard
- не удаляет snapshot/outcome
- только меняет activeVersion
- создаёт lifecycle_event type=ROLLBACK
- должен быть O(1)

## What's Been Implemented

### Session (2026-03-02) - Full Deployment
- Склонирован репозиторий из GitHub
- Установлены зависимости: npm (backend), yarn (frontend), pip (Python)
- Настроены environment variables:
  - FRED_API_KEY: 2c0bf55cfd182a3a4d2e4fd017a622f7
  - MONGODB_URI: mongodb://localhost:27017/fractal_platform
- Запущены все сервисы через supervisor:
  - Backend (Python proxy): порт 8001
  - Backend (TypeScript): порт 8002
  - Frontend (React): порт 3000
  - MongoDB: порт 27017
- Cold Start Bootstrap: SPX/DXY/BTC данные загружены из CSV seeds

### Working Features
1. **BTC Fractal** (/): NEUTRAL/CRISIS/ACCUMULATION, график с прогнозом, Expected Outcomes, Risk & Position
2. **SPX Fractal** (/fractal/spx): BULLISH +2.41%, Cross-Asset режим, Historical Matches
3. **DXY Terminal** (/dxy): BEARISH USD -5.77%, Macro overlay, 90D verdict
4. **Overview** (/overview): Market Overview с BTC/SPX/DXY tabs, горизонты 7d-365d
5. **Admin Panel** (/admin): Login страница для администрирования
6. **Lifecycle System**: Version management, snapshots, outcomes, rollback

### API Endpoints Working
- `GET /api/health` - System health check
- `GET /api/fractal/v2.1/focus-pack?focus={horizon}` - BTC Fractal
- `GET /api/spx/v2.1/focus-pack?horizon={horizon}` - SPX Fractal
- `GET /api/fractal/dxy/terminal?focus={horizon}` - DXY Terminal
- `GET /api/ui/overview?asset={asset}&horizon={days}` - Overview aggregator
- `GET /api/fractal/v2.1/admin/lifecycle/status` - Lifecycle status
- `POST /api/fractal/v2.1/admin/lifecycle/promote` - Promote version
- `POST /api/fractal/v2.1/admin/lifecycle/resolve` - Resolve snapshots
- `POST /api/fractal/v2.1/admin/lifecycle/rollback` - Rollback to previous version
- `GET /api/fractal/v2.1/admin/governance/model-config` - Get model config
- `POST /api/fractal/v2.1/admin/governance/model-config` - Update model config

### Testing Results (2026-03-02)
- Backend: 100% pass rate (9/9 tests)
- Frontend: 100% pass rate (5/5 pages)
- Lifecycle: 100% (version management active)
- Admin: 100% (model configuration working)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта из GitHub
- [x] Настройка всех сервисов
- [x] Проверка всех основных страниц
- [x] FRED_API_KEY установлен
- [x] Lifecycle system активна

### P1 (High Priority) - Next Phase
- [ ] SPX Lifecycle layer (copy from BTC)
- [ ] DXY Lifecycle layer (with macro overlay)
- [ ] Cross-Asset dependency graph

### P2 (Medium Priority)
- [ ] Snapshot comparison и divergence tracking
- [ ] Performance optimization
- [ ] Admin dashboard enhancements

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Multi-timeframe overlay
- [ ] Alert system integration

## Next Tasks
1. Согласно PRD v2.0 - Расширение Lifecycle на SPX (copy BTC pattern)
2. Затем на DXY (с macro overlay awareness)
3. Cross-asset lifecycle unification
4. Admin panel doработка для governance UI
