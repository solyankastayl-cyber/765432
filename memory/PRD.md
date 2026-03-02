# Fractal Platform PRD

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/hcdcu8388
Модули: BTC Fractal, SPX Fractal, DXY Terminal, Admin Panel
API ключ для macro (FRED): 2c0bf55cfd182a3a4d2e4fd017a622f7

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: prediction_snapshots, fractal_canonical_ohlcv, spx_candles, dxy_candles

## User Personas
1. **Trader** - Использует прогнозы для торговых решений
2. **Analyst** - Изучает исторические паттерны и точность модели
3. **Admin** - Управляет системой через Admin Panel

## Core Requirements (Static)
1. История всех активов начинается с FIXED_HISTORY_START = 2026-01-01
2. Формат серии: [history] → anchor → [forecast]
3. anchorIndex корректно рассчитывается и сохраняется
4. Все горизонты поддерживаются: 7d, 14d, 30d, 90d, 180d, 365d
5. Overview читает ТОЛЬКО из prediction_snapshots (READ-ONLY)

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

### Testing Results (2026-03-02)
- Backend: 100% pass rate (9/9 tests)
- Frontend: 100% pass rate (4/4 pages)
- Integration: 95% (minor WebSocket issues don't affect core functionality)

### Bug Fix Session (2026-03-02)
**Issue**: Historical Matches в BTC Fractal (Hybrid/SPX Overlay режимы) подсвечивали ДВА фрактала вместо одного
- Зеленый - best match (highest similarity)
- Черный жирный - primaryMatch (weighted selection)

**Fix**: Изменён `MatchPicker` компонент в `FractalHybridChart.jsx`:
- Теперь выделяется ТОЛЬКО один match - с максимальным similarity (первый в отсортированном списке)
- Убрана зависимость от `primaryMatchId` (weighted selection) для визуального выделения
- Файл: `/app/frontend/src/components/fractal/chart/FractalHybridChart.jsx`

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта из GitHub
- [x] Настройка всех сервисов
- [x] Проверка всех основных страниц
- [x] FRED_API_KEY установлен

### P1 (High Priority)
- [ ] WebSocket real-time updates (minor issues noted)
- [ ] Snapshot comparison и divergence tracking

### P2 (Medium Priority)
- [ ] Performance optimization
- [ ] Admin dashboard enhancements

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Multi-timeframe overlay

## Next Tasks
1. Доработка модуля фракталов (индексы валютных пар) - по запросу пользователя
2. Улучшение WebSocket интеграции (если потребуется)
3. Добавить расширенную аналитику в Admin Panel
