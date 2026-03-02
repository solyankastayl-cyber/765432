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

### V1 LOCKED Implementation:
- **FIXED_HISTORY_START_ISO** = "2026-01-01T00:00:00.000Z" в buildFullSeries.ts
- **BTC crossAsset required** - убран fallback на hybrid в overview.service.ts
- SPX/DXY могут использовать hybrid fallback (допускается по спецификации)

## Testing Results (2026-03-02)
- Backend: 100% pass rate (7/7 endpoints)
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

### P1 (High Priority)
- [ ] Генерация crossAsset snapshots для BTC (сейчас использует terminal endpoint)
- [ ] WebSocket real-time updates (пользователь просил пока не трогать)
- [ ] Snapshot comparison и divergence tracking

### P2 (Medium Priority)
- [ ] Performance optimization для больших серий
- [ ] Admin dashboard enhancements
- [ ] Унификация loader (один источник данных для Overview)

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Multi-timeframe overlay

## Next Tasks
1. Создать crossAsset snapshots для BTC (сейчас данные приходят из terminal endpoint)
2. Исправить extractDxyData чтобы использовать external candles
3. Audit endpoint расширить для проверки инвариантов
