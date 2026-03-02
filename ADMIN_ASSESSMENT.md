# ОЦЕНКА АДМИНКИ - КРИТИЧЕСКАЯ ИНФОРМАЦИЯ

## 🔐 АУТЕНТИФИКАЦИЯ

### Credentials
```
Username: admin
Password: admin12345
```

### API
```bash
# Login
POST /api/admin/auth/login
Body: {"username":"admin","password":"admin12345"}
Response: {"ok":true,"token":"JWT...","role":"ADMIN"}

# Check status
GET /api/admin/auth/status
Header: Authorization: Bearer <token>
```

### Файлы
- Backend: `/app/backend/src/core/admin/admin.auth.routes.ts`
- Service: `/app/backend/src/core/admin/admin.auth.service.ts`
- Middleware: `/app/backend/src/core/admin/admin.middleware.ts`
- Frontend: `/app/frontend/src/pages/admin/AdminLoginPage.jsx`
- Context: `/app/frontend/src/context/AdminAuthContext.jsx`

---

## ⚠️ КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Большинство Admin API НЕ РАБОТАЮТ в FRACTAL_ONLY режиме

| Endpoint | Статус | Причина |
|----------|--------|---------|
| `/api/admin/dashboard` | ❌ 404 | Не зарегистрирован |
| `/api/admin/ml/models` | ❌ 404 | Не зарегистрирован |
| `/api/lifecycle/states` | ❌ 404 | Не зарегистрирован |
| `/api/admin/settings` | ❌ 404 | Не зарегистрирован |
| `/api/admin/health` | ❌ 404 | Не зарегистрирован |

### 2. Работающие Admin Endpoints (FRACTAL_ONLY)

| Endpoint | Статус | Данные |
|----------|--------|--------|
| `/api/admin/auth/login` | ✅ | JWT auth |
| `/api/admin/auth/status` | ✅ | Session info |
| `/api/spx/v2.1/admin/memory/stats` | ✅ | 0 snapshots |
| `/api/spx/v2.1/admin/calibration/status` | ✅ | Calibration data |
| `/api/fractal/admin/dataset` | ✅ | Dataset info |

### 3. Frontend страницы БЕЗ рабочего backend

57 admin страниц существуют, но большинство вызывают API которые возвращают 404.

---

## 📊 СОСТОЯНИЕ ДАННЫХ В MONGODB

| Коллекция | Документов | Комментарий |
|-----------|------------|-------------|
| `admin_users` | 1 | ✅ Seed admin |
| `admin_settings` | 0 | ❌ Пусто |
| `mlops_audit_log` | 0 | ❌ Пусто |
| `model_lifecycle_state` | 0 | ❌ Пусто |
| `prediction_snapshots` | 7 | ✅ Есть данные |
| `fractal_canonical_ohlcv` | 5706 | ✅ BTC данные |
| `spx_candles` | 19242 | ✅ SPX данные |
| `dxy_candles` | 13366 | ✅ DXY данные |

---

## 🔧 ЧТО НУЖНО СДЕЛАТЬ ДЛЯ ПОЛНОЦЕННОЙ АДМИНКИ

### Вариант A: Минимальный (быстрый)
Зарегистрировать существующие admin routes в `app.fractal.ts`:

```typescript
// В /app/backend/src/app.fractal.ts добавить:
import { adminHealthRoutes } from './api/admin.health.routes.js';
import { adminSettingsRoutes } from './api/admin.settings.routes.js';
import { adminDashboardRoutes } from './api/admin.dashboard.routes.js';

// После adminAuthRoutes:
await app.register(adminHealthRoutes, { prefix: '/api/admin' });
await app.register(adminSettingsRoutes, { prefix: '/api/admin' });
await app.register(adminDashboardRoutes, { prefix: '/api/admin' });
```

### Вариант B: Полный (рекомендуемый)
1. Создать новый dashboard API для FRACTAL_ONLY режима
2. Собирать метрики из работающих модулей:
   - BTC Fractal accuracy
   - SPX Consensus stats
   - DXY Terminal stats
   - Data quality metrics

---

## 📁 КЛЮЧЕВЫЕ ФАЙЛЫ ДЛЯ РАБОТЫ

### Backend Registration (куда добавлять routes)
```
/app/backend/src/app.fractal.ts  # Главный файл для FRACTAL_ONLY
```

### Существующие Admin Routes (можно подключить)
```
/app/backend/src/api/admin.health.routes.ts
/app/backend/src/api/admin.settings.routes.ts  
/app/backend/src/api/admin.dashboard.routes.ts
/app/backend/src/api/admin.ml.routes.ts
/app/backend/src/api/admin.state.routes.ts
/app/backend/src/api/admin.metrics.routes.ts
```

### Frontend Admin Pages
```
/app/frontend/src/pages/admin/AdminDashboardPage.jsx
/app/frontend/src/pages/admin/AdminSettingsPage.jsx
/app/frontend/src/pages/admin/SystemOverviewPage.jsx
/app/frontend/src/api/admin.api.js
```

---

## 🎯 ПРИОРИТЕТЫ ДОРАБОТКИ

### P0 - Критично
1. **Dashboard API** - создать/подключить `/api/admin/dashboard`
2. **System Health** - метрики работоспособности

### P1 - Важно  
3. **Settings API** - настройки системы
4. **Data Pipelines** - статус загрузки данных
5. **Model Lifecycle** - управление моделями

### P2 - Желательно
6. **ML Accuracy** - метрики точности
7. **Audit Log** - журнал действий
8. **User Management** - управление админами

---

## 🔗 ЗАВИСИМОСТИ МЕЖДУ КОМПОНЕНТАМИ

```
AdminDashboardPage.jsx
    │
    ├── getDashboard() → /api/admin/dashboard [❌ 404]
    │
    └── useAdminAuth() → AdminAuthContext
                              │
                              └── /api/admin/auth/* [✅ работает]

SystemOverviewPage.jsx  
    │
    └── getSystemOverview() → /api/admin/system/overview [❌ 404]

AdminSettingsPage.jsx
    │
    ├── getSettings() → /api/admin/settings [❌ 404]
    └── saveSettings() → /api/admin/settings [❌ 404]
```

---

## ✅ РЕКОМЕНДАЦИЯ

**Для начала работы над админкой нужно:**

1. Решить какие API подключать из существующих vs создавать новые
2. Обновить `app.fractal.ts` для регистрации routes
3. Адаптировать frontend pages под реальные данные FRACTAL_ONLY режима
4. Создать seed данные для тестирования (settings, lifecycle state, etc.)
