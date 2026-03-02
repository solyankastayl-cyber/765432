# Fractal Platform PRD

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/wdwwdwdwd
Модули: BTC Fractal, SPX Fractal, DXY Terminal, Admin Panel
API ключ для macro (FRED): 2c0bf55cfd182a3a4d2e4fd017a622f7

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: prediction_snapshots, fractal_canonical_ohlcv, spx_candles, dxy_candles

## Core Requirements (Static - V1 LOCKED)
1. История всех активов начинается с FIXED_HISTORY_START = 2026-01-01
2. Формат серии: [history] → anchor → [forecast]
3. anchorIndex корректно рассчитывается и сохраняется
4. Все горизонты поддерживаются: 7d, 14d, 30d, 90d, 180d, 365d
5. Overview читает ТОЛЬКО из prediction_snapshots (READ-ONLY)
6. **V1 LOCKED**: BTC crossAsset snapshots - NO FALLBACK to hybrid

## User Personas
1. **Trader** - Использует прогнозы для торговых решений
2. **Analyst** - Изучает исторические паттерны и точность модели
3. **Admin** - Управляет системой через Admin Panel

## What's Been Implemented

### Session 1 (2026-03-02) - Full Deployment
- Склонирован репозиторий из GitHub
- Установлены зависимости: npm (backend), yarn (frontend)
- Настроены environment variables:
  - FRED_API_KEY: 2c0bf55cfd182a3a4d2e4fd017a622f7
  - MONGODB_URI: mongodb://localhost:27017/fractal_platform
- Запущены все сервисы через supervisor:
  - Backend (Python proxy): порт 8001
  - Backend (TypeScript): порт 8002
  - Frontend (React): порт 3000
  - MongoDB: порт 27017

### Data Bootstrap Complete:
- BTC: 5692 свечей (fractal_canonical_ohlcv)
- DXY: 13366 свечей (dxy_candles)
- SPX: данные загружены из CSV seed файла

### Working Features:
1. **BTC Fractal** (/): График с прогнозом, Expected Outcomes, Risk & Position
2. **SPX Fractal** (/fractal/spx): SPX Verdict BULLISH +2.41%, Cross-Asset режим
3. **DXY Terminal** (/dxy): BEARISH USD verdict, -5.77% expected, Macro overlay
4. **Overview** (/overview): Агрегация всех активов, переключение горизонтов
5. **Admin Panel** (/admin): Страница логина для администрирования

### API Endpoints Working:
- `GET /api/health` - System health check
- `GET /api/fractal/v2.1/focus-pack?focus={horizon}` - BTC Fractal
- `GET /api/spx/v2.1/focus-pack?horizon={horizon}` - SPX Fractal
- `GET /api/fractal/dxy/terminal?focus={horizon}` - DXY Terminal
- `GET /api/ui/overview?asset={asset}&horizon={days}` - Overview aggregator
- `GET /api/prediction/snapshots` - Stored predictions
- `GET /api/audit/v1-check` - V1 LOCKED invariants audit
- `POST /api/ui/generate-btc-crossasset` - BTC crossAsset snapshot generator
- `POST /api/ui/generate-dxy-snapshot` - DXY hybrid snapshot generator

### V1 LOCKED Implementation (2026-03-02):
- **FIXED_HISTORY_START_ISO** = "2026-01-01T00:00:00.000Z" в buildFullSeries.ts
- **BTC crossAsset required** - убран fallback на hybrid в overview.service.ts
- SPX/DXY могут использовать hybrid fallback (допускается по спецификации)
- **Audit endpoint** создан: `/api/audit/v1-check` проверяет все инварианты
- **BTC crossAsset generator** создан: `/api/ui/generate-btc-crossasset`
- **DXY snapshot generator** создан: `/api/ui/generate-dxy-snapshot`

### Session 2 (2026-03-02) - Overview Data Source Fixes
**Проблемы:**
1. DXY и BTC запросы возвращали данные SPX (snapshot asset mismatch)
2. SPX predicted=1 вместо ~90 (forecast.path содержал числа, а код ожидал объекты)
3. Asset validation была case-sensitive ("DXY" не распознавался)

**Исправления в overview.service.ts:**
- Добавлена проверка `snapshotAsset !== assetUpper` для предотвращения использования чужого snapshot
- Исправлен парсинг SPX forecast.path (теперь обрабатывает как числа, так и объекты)
- Asset validation изменена на `asset.toLowerCase()` для case-insensitive сравнения
- Добавлено debug-логирование в route handler

**Результаты после исправления:**
- SPX: actual=494, predicted=91 ✅
- BTC: actual=61, predicted=90 ✅
- DXY: actual=35, predicted=81 ✅

## V1 LOCKED Audit Results (2026-03-02)
```
Summary: 100% pass rate (10/10 checks), Grade: A
✅ HISTORY_START_BTC: History starts at 2026-01-01 (valid)
✅ HISTORY_START_SPX: History starts at 2026-01-02 (valid - Jan 1 market holiday)
✅ HISTORY_START_DXY: History starts at 2026-01-02 (valid)
✅ ANCHOR_LOCK_BTC: Anchor synced at 2026-03-02
✅ ANCHOR_LOCK_SPX: Anchor synced at 2026-03-02
✅ ANCHOR_LOCK_DXY: Anchor synced at 2026-03-02
✅ BTC_CROSSASSET_REQUIRED: crossAsset snapshot found
✅ FORECAST_LENGTH_BTC: Forecast has 89 points (>= 45 required)
✅ FORECAST_LENGTH_SPX: Forecast has 364 points (>= 182 required)
✅ FORECAST_LENGTH_DXY: Forecast has 80 points (>= 45 required)
```

## Testing Results (2026-03-02)
- Backend: 100% pass rate (20/20 tests)
- Frontend: 100% pass rate (5/5 pages)
- Integration: 100% pass rate

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта из GitHub
- [x] Настройка всех сервисов
- [x] Загрузка исторических данных
- [x] Проверка всех основных страниц
- [x] FIXED_HISTORY_START = 2026-01-01 для всех активов
- [x] V1 LOCKED: BTC crossAsset без fallback
- [x] V1 LOCKED: Audit endpoint /api/audit/v1-check
- [x] V1 LOCKED: BTC crossAsset snapshot generator
- [x] V1 LOCKED: DXY snapshot generator

### P1 (High Priority)
- [ ] WebSocket real-time updates (пользователь просил пока не трогать)
- [ ] Snapshot comparison и divergence tracking
- [ ] Автоматическая генерация снэпшотов по расписанию (cron job)

### P2 (Medium Priority)
- [ ] Performance optimization для больших серий
- [ ] Admin dashboard enhancements
- [ ] Унификация loader (один источник данных для Overview)

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Multi-timeframe overlay

## Next Tasks
1. Рассмотреть cron job для автоматической генерации снэпшотов
2. Улучшить WebSocket интеграцию (когда пользователь готов)
3. Добавить расширенную аналитику в Admin Panel
