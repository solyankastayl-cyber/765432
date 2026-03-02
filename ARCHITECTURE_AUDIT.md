# Fractal Platform - Полный Архитектурный Аудит

## 1. ОБЩАЯ АРХИТЕКТУРА

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                             │
│                         Port: 3000                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Pages                    │  Components                              │
│  ├── / (BtcFractalPage)   │  ├── fractal/chart/                     │
│  ├── /fractal/spx         │  │   ├── FractalHybridChart.jsx         │
│  ├── /dxy                 │  │   └── layers/                        │
│  ├── /overview            │  ├── admin/                             │
│  ├── /admin/*             │  ├── spx/                               │
│  └── ...                  │  └── common/                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PYTHON PROXY (FastAPI)                             │
│                   Port: 8001 (/app/backend/server.py)                │
│   - Проксирует все /api/* запросы к TypeScript backend              │
│   - Health endpoint: /api/health                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP Proxy
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   TYPESCRIPT BACKEND (Fastify)                       │
│                   Port: 8002 (/app/backend/src/app.fractal.ts)       │
├─────────────────────────────────────────────────────────────────────┤
│  Modules:                                                            │
│  ├── fractal/          - BTC Fractal Engine                         │
│  ├── spx/              - SPX Legacy                                 │
│  ├── spx-core/         - SPX Core Logic                             │
│  ├── spx-consensus/    - SPX Consensus Builder                      │
│  ├── spx-crisis/       - SPX Crisis Detection                       │
│  ├── spx-regime/       - SPX Regime Analysis                        │
│  ├── dxy/              - DXY Terminal                               │
│  ├── combined/         - Cross-Asset Integration                    │
│  ├── lifecycle/        - Model Lifecycle Management                 │
│  └── admin/            - Admin Authentication & Routes              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MongoDB Driver
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MONGODB                                       │
│                        Port: 27017                                   │
│                        DB: fractal_platform                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. BACKEND МОДУЛИ

### 2.1 Core Modules (FRACTAL_ONLY mode)

| Модуль | Путь | Описание | API Prefix |
|--------|------|----------|------------|
| **Fractal** | `/modules/fractal/` | BTC Fractal Engine | `/api/fractal/*` |
| **BTC** | `/modules/btc/` | BTC-specific routes | `/api/btc/*` |
| **SPX** | `/modules/spx/` | SPX Legacy | `/api/spx/*` |
| **SPX Core** | `/modules/spx-core/` | Focus Pack Builder | `/api/spx/v2.1/*` |
| **SPX Consensus** | `/modules/spx-consensus/` | Consensus Calculator | `/api/spx/v2.1/consensus` |
| **SPX Crisis** | `/modules/spx-crisis/` | Crisis Detection | `/api/spx/v2.1/admin/crisis/*` |
| **SPX Regime** | `/modules/spx-regime/` | Regime Analysis | `/api/spx/v2.1/admin/regimes/*` |
| **DXY** | `/modules/dxy/` | Dollar Index Terminal | `/api/fractal/dxy/*` |
| **Combined** | `/modules/combined/` | Cross-Asset | `/api/combined/*` |
| **Lifecycle** | `/modules/lifecycle/` | Model Management | `/api/lifecycle/*` |
| **Forward** | `/modules/forward/` | Forward Performance | `/api/forward/*` |
| **Admin Auth** | `/core/admin/` | Authentication | `/api/admin/auth/*` |

### 2.2 Зависимости между модулями

```
BtcFractalPage (Frontend)
    │
    ├── GET /api/fractal/v2.1/focus-pack
    │       │
    │       └── fractal.engine.ts
    │               │
    │               ├── fractal_canonical_ohlcv (MongoDB)
    │               ├── prediction_snapshots (MongoDB)
    │               └── spx-core (для cross-asset)
    │
    └── GET /api/spx/v2.1/focus-pack (SPX Overlay mode)
            │
            └── spx-consensus.service.ts
                    │
                    ├── spx_candles (MongoDB)
                    └── spx-phase.service.ts
```

---

## 3. MONGODB КОЛЛЕКЦИИ

### 3.1 Основные коллекции для Fractal

| Коллекция | Описание | Используется в |
|-----------|----------|----------------|
| `fractal_canonical_ohlcv` | BTC OHLCV данные | Fractal Engine |
| `spx_candles` | SPX дневные свечи | SPX Module |
| `dxy_candles` | DXY данные | DXY Terminal |
| `prediction_snapshots` | Снапшоты прогнозов | Overview, History |
| `decision_outcomes` | Результаты решений | Accuracy tracking |
| `learning_samples` | Обучающие данные | ML Pipeline |

### 3.2 Admin-related коллекции

| Коллекция | Описание |
|-----------|----------|
| `admin_settings` | Настройки админки |
| `mlops_audit_log` | Аудит ML операций |
| `mlops_promotion_state` | Состояние промоушена моделей |
| `model_lifecycle_events` | События жизненного цикла |
| `model_lifecycle_state` | Текущее состояние моделей |

### 3.3 ML/Training коллекции

| Коллекция | Описание |
|-----------|----------|
| `ml_model_registry` | Реестр ML моделей |
| `ml_accuracy_snapshots` | Метрики точности |
| `ml_inference_log` | Логи инференса |
| `ml_drift_events` | События дрифта |

---

## 4. FRONTEND СТРУКТУРА

### 4.1 Основные страницы

```
/app/frontend/src/pages/
├── BtcFractalPage.jsx      # / - Главная (BTC Fractal)
├── FractalPage.js          # /fractal/:symbol - Universal Fractal
├── SpxTerminalPage.js      # /fractal/spx - SPX Terminal
├── DxyTerminalPage.jsx     # /dxy - DXY Terminal
├── OverviewPage.jsx        # /overview - Overview Dashboard
└── admin/
    ├── AdminLoginPage.jsx      # /admin/login
    ├── AdminDashboardPage.jsx  # /admin - Dashboard
    ├── AdminMLPage.jsx         # /admin/ml
    ├── AdminSettingsPage.jsx   # /admin/settings
    ├── AdminBacktestingPage.jsx # /admin/backtesting
    ├── AdminMLAccuracyPage.jsx # /admin/ml-accuracy
    └── ... (50+ admin pages)
```

### 4.2 Ключевые компоненты

```
/app/frontend/src/components/
├── fractal/
│   ├── chart/
│   │   ├── FractalHybridChart.jsx   # Основной чарт с режимами
│   │   ├── MatchPicker              # Historical Matches picker
│   │   └── layers/                  # Chart layers
│   ├── hooks/
│   │   └── useFractalOverlay.js     # Data fetching hooks
│   └── sections/
│       └── FractalAnalysisPanel.jsx # Analysis panel
├── admin/
│   ├── metrics/                     # Admin metrics components
│   └── connections/                 # Connection management
├── spx/
│   └── SpxOverlayBlock.jsx         # SPX Overlay component
└── common/
    └── ... shared components
```

---

## 5. API ENDPOINTS

### 5.1 Fractal API

```
GET  /api/fractal/v2.1/focus-pack?focus={7d|30d|90d|180d|365d}
     → BTC Fractal data with forecast, matches, scenarios

GET  /api/fractal/dxy/terminal?focus={horizon}
     → DXY Terminal data

POST /api/fractal/admin/backtest
     → Run backtesting

GET  /api/fractal/admin/dataset
     → Training dataset info
```

### 5.2 SPX API

```
GET  /api/spx/v2.1/focus-pack?horizon={7d|30d|90d}
     → SPX Focus Pack with consensus

GET  /api/spx/v2.1/consensus
     → SPX Consensus data

GET  /api/spx/v2.1/admin/memory/stats
     → Memory statistics

GET  /api/spx/v2.1/admin/crisis/status
     → Crisis detection status

GET  /api/spx/v2.1/admin/regimes/current
     → Current regime analysis
```

### 5.3 Admin API

```
# Authentication
POST /api/admin/auth/login
     Body: { username, password }
     → { ok, token, role }

GET  /api/admin/auth/status
     Header: Authorization: Bearer <token>
     → Session status

GET  /api/admin/auth/users
     → List admin users (ADMIN only)

POST /api/admin/auth/users
     Body: { username, password, role }
     → Create admin user

# Dashboard
GET  /api/admin/dashboard
     → System overview metrics

# Settings
GET  /api/admin/settings
POST /api/admin/settings

# ML Operations
GET  /api/admin/ml/models
GET  /api/admin/ml/accuracy
POST /api/admin/ml/retrain
GET  /api/admin/ml/approvals/pending
POST /api/admin/ml/approvals/approve
```

---

## 6. ТОЧКИ КОНТРОЛЯ ДЛЯ АДМИНКИ

### 6.1 Аутентификация

**Файлы:**
- `/app/backend/src/core/admin/admin.auth.routes.ts` - Auth routes
- `/app/backend/src/core/admin/admin.auth.service.ts` - Auth logic
- `/app/backend/src/core/admin/admin.middleware.ts` - Auth middleware
- `/app/backend/src/core/admin/admin.models.ts` - User model

**Роли:**
- `ADMIN` - Полный доступ
- `MODERATOR` - Ограниченный доступ

**Default credentials (seed):**
- Username: `admin`
- Password: в `.env` или генерируется

### 6.2 Dashboard Metrics

**API:** `GET /api/admin/dashboard`

**Метрики:**
- System health
- Model accuracy
- Data pipeline status
- Recent predictions

### 6.3 Model Lifecycle

**Контрольные точки:**
1. **Training** - Запуск обучения
2. **Validation** - Проверка качества
3. **Shadow** - Теневое тестирование
4. **Promotion** - Промоушен в production
5. **Rollback** - Откат к предыдущей версии

**API:**
```
GET  /api/lifecycle/states
POST /api/lifecycle/promote
POST /api/lifecycle/rollback
```

### 6.4 ML Governance

**Файл:** `/app/backend/src/core/ml_governance/admin.ml.governance.routes.ts`

**Endpoints:**
```
GET  /api/admin/ml/approvals/pending
GET  /api/admin/ml/approvals/candidates
POST /api/admin/ml/approvals/request
POST /api/admin/ml/approvals/approve
POST /api/admin/ml/approvals/reject
```

---

## 7. FRONTEND ADMIN CONTEXT

### 7.1 AdminAuthContext

**Файл:** `/app/frontend/src/context/AdminAuthContext.jsx`

```javascript
// Provides:
{
  user,           // Current admin user
  token,          // JWT token
  isAdmin,        // Is user admin?
  isAuthenticated,
  login,          // Login function
  logout,         // Logout function
  loading,        // Auth loading state
}
```

### 7.2 Admin API Client

**Файл:** `/app/frontend/src/api/admin.api.js`

```javascript
// Functions:
adminLogin(username, password)
getAuthStatus()
getDashboard()
getSettings()
saveSettings(settings)
getMLModels()
// ... etc
```

---

## 8. ЗАВИСИМОСТИ И СВЯЗИ

### 8.1 Data Flow для BTC Fractal

```
User → BtcFractalPage
         │
         ├─1─→ useFractalData hook
         │         │
         │         └─→ GET /api/fractal/v2.1/focus-pack
         │                   │
         │                   └─→ fractal.engine.ts
         │                           │
         │                           ├─→ MongoDB: fractal_canonical_ohlcv
         │                           ├─→ Pattern matching
         │                           └─→ Forecast generation
         │
         └─2─→ FractalHybridChart
                   │
                   ├─→ MatchPicker (Historical Matches)
                   ├─→ Chart with Replay
                   └─→ HybridSummaryPanel
```

### 8.2 Data Flow для Admin Dashboard

```
Admin → AdminLoginPage
          │
          └─→ POST /api/admin/auth/login
                    │
                    └─→ JWT Token
                          │
                          └─→ AdminDashboardPage
                                    │
                                    ├─→ GET /api/admin/dashboard
                                    │         │
                                    │         └─→ System metrics
                                    │
                                    └─→ Navigation to other admin pages
```

---

## 9. КОНФИГУРАЦИЯ

### 9.1 Environment Variables

**Backend (`/app/backend/.env`):**
```
MONGO_URL=mongodb://localhost:27017
MONGODB_URI=mongodb://localhost:27017/fractal_platform
DB_NAME=fractal_platform
FRED_API_KEY=<macro_api_key>
FRACTAL_ONLY=1
JWT_SECRET=<secret>
ADMIN_PASSWORD=<seed_password>
```

**Frontend (`/app/frontend/.env`):**
```
REACT_APP_BACKEND_URL=https://...
```

### 9.2 Feature Flags

**Файл:** `/app/backend/src/config/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  SPX_FINALIZED: true,
  FRACTAL_ONLY: true,
  // ...
};
```

---

## 10. РЕКОМЕНДАЦИИ ДЛЯ РАБОТЫ С АДМИНКОЙ

### 10.1 Добавление новой admin страницы

1. Создать компонент в `/app/frontend/src/pages/admin/`
2. Добавить route в `/app/frontend/src/App.js`
3. Если нужен новый API:
   - Backend: `/app/backend/src/core/admin/` или `/app/backend/src/modules/admin/`
   - Зарегистрировать в `/app/backend/src/app.fractal.ts`

### 10.2 Расширение существующей функциональности

**ML Management:**
- Routes: `/app/backend/src/api/admin.ml.routes.ts`
- Models: `/app/backend/src/core/ml_governance/`

**System Settings:**
- Routes: `/app/backend/src/api/admin.settings.routes.ts`
- Frontend: `/app/frontend/src/pages/admin/AdminSettingsPage.jsx`

### 10.3 Критические зависимости

| Изменение | Проверить |
|-----------|-----------|
| MongoDB schema | Миграции, индексы |
| API endpoint | Frontend вызовы |
| Auth middleware | Все protected routes |
| Feature flag | Все места использования |

---

## 11. ТЕКУЩИЙ СТАТУС МОДУЛЕЙ

| Модуль | Статус | Примечания |
|--------|--------|------------|
| BTC Fractal | ✅ Active | Production ready |
| SPX Fractal | ✅ Active | Production ready |
| DXY Terminal | ✅ Active | Production ready |
| Admin Auth | ✅ Active | JWT-based |
| Admin Dashboard | ✅ Active | Basic metrics |
| ML Governance | ⚠️ Partial | Needs enhancement |
| System Monitoring | ⚠️ Partial | WebSocket issues |
| Data Pipelines | 🔄 In Progress | FRACTAL_ONLY mode |

---

*Документ создан: 2026-03-02*
*Версия: 1.0*
