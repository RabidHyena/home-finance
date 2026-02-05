# Roadmap: План дальнейших действий

## Текущий статус

| Фаза | Статус | Описание |
|------|--------|----------|
| Фаза 0 | ✅ Готово | Окружение настроено |
| Фаза 1 | ✅ Готово | Backend MVP |
| Фаза 2 | ✅ Готово | Frontend с моками |
| Фаза 3 | ✅ Готово | Интеграция |
| Фаза 4.1 | ✅ Готово | UX улучшения |
| Фаза 4.2 | ✅ Готово | Функциональность (поиск, фильтры, экспорт, мультивалюта) |
| Фаза 4.3 | ✅ Готово | AI улучшения (авто-категоризация, обучение, batch upload) |
| Фаза 4.4 | ✅ Готово | Расширенная аналитика |
| Фаза 4.5 | ✅ Готово | PWA (vite-plugin-pwa, офлайн, установка) |

---

## Что реализовано

### Backend (Фаза 1)
- [x] Структура проекта FastAPI
- [x] Модели данных (SQLAlchemy)
- [x] Pydantic схемы для валидации
- [x] CRUD API для транзакций
- [x] Пагинация и фильтрация
- [x] Месячные отчёты по категориям
- [x] Сервис OCR (Gemini Vision через OpenRouter)
- [x] Загрузка скриншотов
- [x] Docker и docker-compose
- [x] Базовые тесты

### Frontend (Фаза 2)
- [x] React + TypeScript + Vite
- [x] TailwindCSS стили
- [x] React Router навигация
- [x] Mock API для разработки
- [x] Страницы:
  - [x] HomePage — дашборд
  - [x] UploadPage — загрузка скриншотов
  - [x] TransactionsPage — список с CRUD
  - [x] ReportsPage — отчёты и графики
- [x] Компоненты:
  - [x] Layout с навигацией
  - [x] TransactionCard
  - [x] TransactionForm
  - [x] UploadZone (drag-n-drop)
  - [x] MonthlyChart (Recharts)
  - [x] CategoryChart (Pie chart)
- [x] Адаптивный дизайн (mobile)
- [x] Docker конфигурация

---

## Фаза 3: Интеграция (следующий шаг)

### 3.1 Подключение к реальному API
- [x] Переключить `USE_MOCK = false` в `api/client.ts`
- [x] Настроить CORS в backend
- [x] Исправить nginx proxy (client_max_body_size, таймауты)
- [x] Тестирование end-to-end (pytest + Playwright)

### 3.2 Улучшения API клиента
- [x] Добавить React Query хуки
- [x] Обработка ошибок
- [x] Loading states
- [x] Кеширование (staleTime: 5 min)

### 3.3 Авторизация (опционально — перенесено в Фазу 4)
- [ ] JWT токены
- [ ] Страница логина
- [ ] Protected routes

### Команды для интеграции

```bash
# Запустить полный стек в Docker
docker-compose up --build

# Или для разработки:
# Терминал 1 - Backend
cd backend && uvicorn app.main:app --reload

# Терминал 2 - Frontend (с прокси на backend)
cd frontend && npm run dev

# Backend тесты (CRUD, пагинация, фильтрация, отчёты, валидация)
cd backend && DATABASE_URL="sqlite:///:memory:" pytest -v

# Frontend E2E тесты (требует запущенный стек через docker-compose)
cd frontend && npm run test:e2e
```

---

## Фаза 4: Улучшения

### 4.1 UX улучшения
- [x] Подтверждение удаления (modal)
- [x] Toast уведомления
- [x] Скелетоны загрузки
- [x] Infinite scroll для транзакций

### 4.2 Функциональность
- [x] Поиск по транзакциям (ILIKE по description и raw_text)
- [x] Фильтр по датам (date_from, date_to)
- [x] Экспорт в CSV (с учетом фильтров, UTF-8 BOM)
- [x] Мультивалютность (RUB, USD, EUR, GBP)

### 4.3 AI улучшения ✅ ЗАВЕРШЕНО
- [x] Автокатегоризация с confidence-based флагами (≥80% - зелёный, 50-79% - оранжевый, <50% - красный)
- [x] Обучение на исправлениях (3+ corrections + 70% agreement threshold)
- [x] Batch загрузка (до 10 скриншотов одновременно)
- [x] CategorySelector компонент с inline редактированием
- [x] Сохранение ai_category и ai_confidence в БД
- [x] Merchant name normalization (удаление шума, карт, дат)
- [x] Analytics endpoint (/api/transactions/analytics/ai-accuracy)
- [x] Learning service с автоматическим созданием merchant-category mappings
- [x] Применение выученных категорий во время OCR parsing
- [x] Исправления: ParsedTransaction.get() и toFixed() ошибки

### 4.4 Расширенная аналитика ✅ ЗАВЕРШЕНО
#### 4.4.1 Сравнение месяцев
- [x] Endpoint: GET /api/transactions/analytics/comparison?year=2026&month=1
- [x] Возвращает: текущий месяц vs предыдущий месяц
- [x] Метрики: total_amount, transaction_count, top_categories, changes (%)
- [x] Компонент MonthComparison с визуализацией изменений

#### 4.4.2 Тренды расходов
- [x] Endpoint: GET /api/transactions/analytics/trends?period=6months
- [x] Линейный график расходов по месяцам (последние N месяцев)
- [x] Тренд линия (линейная регрессия)
- [x] Средний расход в месяц
- [x] Компонент TrendsChart с Recharts LineChart

#### 4.4.3 Бюджеты и лимиты
- [x] Модель Budget: category, limit_amount, period (monthly/weekly)
- [x] CRUD endpoints для бюджетов
- [x] Endpoint: GET /api/budgets/status - текущее состояние бюджетов
- [x] Страница BudgetsPage с управлением лимитами
- [x] Прогресс-бары по категориям
- [x] Уведомления при превышении лимита (toast)

#### 4.4.4 Прогнозирование
- [x] Endpoint: GET /api/transactions/analytics/forecast?months=3
- [x] Простой алгоритм: среднее за последние N месяцев
- [x] Прогноз на следующие M месяцев
- [x] Компонент ForecastChart с предсказанными значениями
- [x] Доверительный интервал (min/max на основе стандартного отклонения)

### 4.5 PWA ✅ ЗАВЕРШЕНО
- [x] vite-plugin-pwa с Workbox (автоматический precache и runtime caching)
- [x] Офлайн режим (Cache-First для статики, Network-First для API)
- [x] Web App Manifest (иконки PNG 192/512, SVG, maskable)
- [x] Установка на устройство (standalone display)
- [x] OfflineIndicator компонент с анимацией
- [x] Offline fallback страница
- [x] Apple-touch-icon и meta-теги для iOS/Android
- [x] Автоматическое обновление SW с уведомлением пользователя

---

## Команды для работы

```bash
# Разработка frontend (с моками)
cd frontend && npm run dev

# Сборка frontend
cd frontend && npm run build

# Запуск всего в Docker
docker-compose up --build

# Только backend + db
docker-compose up backend db

# Тесты backend
cd backend && pytest -v

# Логи
docker-compose logs -f

# Остановить
docker-compose down
```

---

## Файлы для редактирования

| Задача | Файл |
|--------|------|
| Добавить категорию | `frontend/src/types/index.ts` |
| Изменить mock данные | `frontend/src/api/mockData.ts` |
| Переключить на реальный API | `frontend/src/api/client.ts` (USE_MOCK) |
| Добавить страницу | `frontend/src/pages/` + `App.tsx` |
| Изменить стили | `frontend/src/index.css` |
| API endpoint | `backend/app/routers/` |
| Модель данных | `backend/app/models.py` + `schemas.py` |

---

## Полезные ссылки

- [React Docs](https://react.dev/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Recharts](https://recharts.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [OpenRouter API](https://openrouter.ai/docs)

---

## Прогресс

**Завершено:** Фазы 0-4.5 (100% запланированной функциональности)
**Осталось:** Авторизация (опционально)

---

*Обновлено: 5 февраля 2026 - после завершения Фазы 4.5 (PWA)*
