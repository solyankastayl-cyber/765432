# Fractal Platform PRD

## Original Problem Statement
Развёртывание Fractal Platform из GitHub репозитория https://github.com/solyankastayl-cyber/543cdddd2
Модули: BTC Fractal, SPX Fractal, DXY Terminal, Admin Panel
API ключ для macro (FRED): 2c0bf55cfd182a3a4d2e4fd017a622f7

## Architecture
- **Backend**: TypeScript (Fastify) на порту 8002, проксируется через Python FastAPI на порту 8001
- **Frontend**: React с TailwindCSS на порту 3000
- **Database**: MongoDB (fractal_platform)
- **Key Collections**: prediction_snapshots, fractal_canonical_ohlcv, spx_candles, dxy_candles

## Core Requirements (Static)
1. История всех активов начинается с FIXED_HISTORY_START = 2026-01-01
2. Формат серии: [history] → anchor → [forecast]
3. anchorIndex корректно рассчитывается и сохраняется
4. Все горизонты поддерживаются: 7d, 14d, 30d, 90d, 180d, 365d
5. Overview читает ТОЛЬКО из prediction_snapshots (READ-ONLY)

## User Personas
1. **Trader** - Использует прогнозы для торговых решений
2. **Analyst** - Изучает исторические паттерны и точность модели
3. **Admin** - Управляет системой через Admin Panel

## What's Been Implemented

### Session 1 (2026-03-02) - Initial Deployment
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
- SPX: данные из CSV seed файла

### Working Features:
1. **BTC Fractal** (/): График с прогнозом, Expected Outcomes, Risk & Position
2. **SPX Fractal** (/fractal/spx): SPX Verdict, Cross-Asset режим, +2.41% projection
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

## Testing Results (2026-03-02)
- Backend: 100% pass rate (8/8 endpoints)
- Frontend: 100% pass rate (5/5 pages)
- Integration: 100% pass rate

## АУДИТ ЛОГИКИ ФРАКТАЛОВ (2026-03-02)

### ✅ РЕАЛИЗОВАНО согласно требованиям:

1. **FIXED_HISTORY_START_ISO = "2026-01-01T00:00:00.000Z"**
   - Константа определена в `/app/backend/src/shared/utils/buildFullSeries.ts` (строки 22-23)
   - Используется для всех активов (BTC/SPX/DXY) и всех горизонтов (7d-365d)

2. **buildFullSeries() резает по historyStart**
   - Функция использует `FIXED_HISTORY_START_DATE` (строка 76)
   - Не зависит от horizon при построении истории

3. **buildFullSeriesFromCandles() создана**
   - Функция для построения серии из реальных candle closes (строки 135-178)
   - Поддерживает параметр `historyStartISO`

4. **Candles API возвращает from=2026-01-01**
   - BTC: from=2026-01-01 ✓
   - SPX: from=2026-01-02 (первый торговый день) ✓

5. **Forecast длина соответствует horizon**
   - BTC 7d: 7 точек ✓
   - BTC 14d: 14 точек ✓
   - BTC 30d: 30 точек ✓
   - SPX 7d/30d: корректно ✓
   - DXY 7d/30d: корректно ✓

6. **Audit endpoint /api/audit/overview-series**
   - Возвращает: candles info, series info, forecast count, errors

### ⚠️ Известные несоответствия:
- BTC 7d/14d: series для Overview начинается с ~2026-01-17 (не критично - зависит от currentWindow.raw)
- SPX candles начинаются с 2026-01-02 (ожидаемо - праздник 01.01)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Развёртывание проекта из GitHub
- [x] Настройка всех сервисов
- [x] Загрузка исторических данных
- [x] Проверка всех основных страниц
- [x] FIXED_HISTORY_START = 2026-01-01 для всех активов
- [x] buildFullSeries/buildFullSeriesFromCandles реализованы
- [x] Candles API возвращает from=2026-01-01
- [x] Audit endpoint /api/audit/overview-series создан
- [x] Все горизонты 7d/14d/30d/90d/180d/365d генерируют forecast

### P1 (High Priority)
- [ ] Передать historicalCandles в extractBtcSnapshotPayload для полной истории 7d/14d
- [ ] WebSocket real-time updates
- [ ] Snapshot comparison и divergence tracking

### P2 (Medium Priority)
- [ ] Performance optimization для больших серий
- [ ] Admin dashboard enhancements

### P3 (Nice to Have)
- [ ] Export functionality
- [ ] Multi-timeframe overlay

## Session 2 (2026-03-02) - Bug Fixes P0-P2

### Исправлено:

1. **P0: /api/ui/candles возвращал неполные данные (отсутствовали o,h,l,c)**
   - Причина: Неправильный маппинг полей для BTC (данные в nested `ohlcv: {o,h,l,c,v}`)
   - Исправлено в: `/app/backend/src/modules/overview/overview.service.ts` (строки 684-699)

2. **P1: DXY forecast длина не соответствовала горизонту (7d возвращал 1 точку)**
   - Причина 1: Snapshots создавались с anchorIndex в конце серии
   - Причина 2: Fallback на terminal не получал candles для actual
   - Исправлено: Добавлена проверка `minPredicted` (50% от horizonDays) для fallback на terminal
   - Изменен источник candles с `/api/market/candles` на `/api/ui/candles`

3. **P2: /api/market/candles?asset=DXY возвращал пустой массив**
   - Причина: Сравнение `date` как строки, но в dxy_candles это datetime объект
   - Исправлено в: `/app/backend/src/modules/prediction/prediction_snapshots.service.ts` (строки 335-352)

### Файлы изменены:
- `/app/backend/src/modules/overview/overview.service.ts`
- `/app/backend/src/modules/prediction/prediction_snapshots.service.ts`

## Session 3 (2026-03-02) - Overview Chart Normalization (Spec A-G)

### Исправлено по спецификации:

**A) История фиксирована (A1)**
- historyStart = 2026-01-01 для всех активов/горизонтов
- История НЕ зависит от horizonDays

**B) Anchor выровнен (A2)**
- anchorCandleClose ≈ anchorSeriesValue (delta < 0.3%)
- Все активы проходят audit с anchorDelta = 0%

**C) DXY отрыв исправлен**
- Отключено автосохранение DXY snapshots (неправильный anchorIndex)
- DXY использует terminal fallback с полной историей
- Время в seconds для candles и series (ISO strings)

**D) BTC Overview маппинг**
- BTC теперь пытается использовать `crossAsset` view (final layer)
- Fallback на `hybrid` если crossAsset недоступен

**E) UI Zoom для коротких горизонтов**
- Добавлен `getVisibleRange()` в LivePredictionChart.jsx
- lookbackDays = max(90, horizonDays * 3)
- 7d/14d/30d показывают 90 дней истории

**F) Audit endpoint расширен**
- Добавлены: anchorCandleClose, anchorSeriesValue, anchorDeltaPct
- Добавлен: timeUnit (seconds/ms/ISO_string детект)
- Добавлен: dataSource (snapshot/overview_api)
- INVARIANT checks по спецификации F2

### Файлы изменены:
- `/app/backend/src/modules/overview/overview.service.ts` - BTC crossAsset view, fallback logic
- `/app/backend/src/modules/prediction/prediction_snapshots.service.ts` - audit endpoint v2
- `/app/backend/src/modules/dxy/api/dxy.terminal.routes.ts` - disabled snapshot auto-save
- `/app/frontend/src/components/charts/LivePredictionChart.jsx` - UI zoom

### Audit Results (all pass):
```
BTC: 7d/30d/90d ok=True, delta=0%, forecast>85%
SPX: 7d/30d/90d ok=True, delta=0%, forecast>85%
DXY: 7d/30d/90d ok=True, delta=0%, forecast>85% (source=overview_api)
```

## Next Tasks
1. Создать crossAsset snapshots для BTC (сейчас используется hybrid fallback)
2. Исправить extractDxyData чтобы использовать external candles
3. WebSocket real-time updates (пользователь просил пока не трогать)
4. Унифицировать логику получения свечей
