# Home Finance

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

- **Аутентификация**: регистрация, вход, JWT-токены в httpOnly cookies (bcrypt + PyJWT), сброс пароля по email
- **Мультипользовательность**: изоляция данных между пользователями (user_id FK)
- **Безопасность**: CORS, CSP/HSTS/Permissions-Policy headers, CSRF защита (X-CSRF-Token + cookie double-submit), rate limiting (глобальный 100 req/min + 10 req/min для upload), brute force защита (5 попыток → 15 мин блокировка), валидация паролей (буква + цифра), magic byte валидация файлов, CSV/XLSX sanitization (formula injection), SECRET_KEY enforcement, input sanitization (null bytes, HTML, control chars), amount/date range validation, password max 72 bytes (bcrypt), username pattern validation, budget category sanitization, шифрование PII-полей (AES-GCM, cryptography)
- **Расходы и доходы**: тип транзакции (expense/income) с раздельными категориями и фильтрацией
- Загрузка скриншотов банковских приложений (одиночная и пакетная до 10 штук)
- Автоматическое сжатие изображений при загрузке (Pillow, max 2048px, сохранение aspect ratio)
- Импорт выписок из Excel (.xlsx, .xls)
- AI-распознавание транзакций и диаграмм (Gemini 3 Flash через OpenRouter)
- Авто-категоризация с обучением на исправлениях пользователя
- CRUD транзакций с поиском, фильтрами по датам, категориям и типу
- Мультивалютность (RUB, USD, EUR, GBP)
- Экспорт в CSV и Excel (.xlsx с форматированием и защитой от formula injection)
- Аудит-лог операций (login, register, create/update/delete транзакций)
- Email-уведомления: сброс пароля через SMTP
- Бюджеты по категориям (месячные/недельные) с уведомлениями о превышении
- Аналитика: сравнение месяцев, тренды, прогнозирование
- Отчёты с интерактивными графиками (Recharts)
- PWA: установка на устройство, офлайн-режим, кеширование
- Адаптивный интерфейс (mobile + desktop)
- REST API с Swagger UI документацией
- **Производительность**: TTL-кэш аналитики с автоинвалидацией, lazy loading страниц (React.lazy + Suspense), retry с экспоненциальным backoff (OCR + React Query)
- **Наблюдаемость**: структурированное логирование с request ID и замером времени, health check эндпоинт, аудит-лог в БД
- **CI/CD**: GitHub Actions (ruff, pytest, tsc, eslint, vitest)
- **Docker hardening**: read-only FS, ограничение CPU/RAM, tmpfs, graceful shutdown

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Recharts, Inline Styles (CSS Variables), vite-plugin-pwa |
| Backend | Python 3.12, FastAPI, SQLAlchemy (pool_pre_ping, pool_recycle), Alembic, PyJWT, bcrypt |
| Database | PostgreSQL 16 |
| AI | Google Gemini 3 Flash Preview через OpenRouter |
| Containers | Docker, Docker Compose, nginx |
| CI | GitHub Actions (lint + test) |

## Быстрый старт

### 1. Настроить переменные окружения

```bash
cp .env.example .env
# Отредактируйте .env и добавьте ваш OPENROUTER_API_KEY и SECRET_KEY
```

### 2. Запустить в Docker

```bash
docker compose up --build
```

### 3. Открыть приложение

| URL | Описание |
|-----|----------|
| http://localhost:3000 | Веб-интерфейс |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | Swagger UI |

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|:---:|---|---|
| `OPENROUTER_API_KEY` | да | — | API ключ OpenRouter для AI-распознавания |
| `OPENROUTER_MODEL` | нет | `google/gemini-3-flash-preview` | Модель для OCR |
| `DATABASE_URL` | нет | `postgresql://postgres:postgres@db:5432/home_finance` | URL базы данных |
| `SECRET_KEY` | **да** | — | Секретный ключ для JWT. В dev можно использовать `change-me-in-production` (при `DEBUG=true`); в production — случайная строка 32+ символов |
| `DEBUG` | нет | `false` | Режим отладки (разрешает default SECRET_KEY, cookie_secure=false) |
| `SEED_ADMIN_PASSWORD` | нет | `admin` | Пароль admin пользователя при первой миграции |
| `RATE_LIMIT_WINDOW` | нет | `60` | Окно rate limiter в секундах |
| `RATE_LIMIT_MAX_REQUESTS` | нет | `100` (docker) / `10` (default) | Максимум запросов на IP за окно |
| `SMTP_HOST` | нет | `""` | SMTP сервер (оставьте пустым для отключения email) |
| `SMTP_PORT` | нет | `587` | SMTP порт |
| `SMTP_USER` | нет | `""` | SMTP логин |
| `SMTP_PASSWORD` | нет | `""` | SMTP пароль |
| `SMTP_FROM` | нет | `""` | Email отправителя (обязателен при заданном SMTP_HOST) |
| `SMTP_TLS` | нет | `true` | Использовать STARTTLS |
| `FRONTEND_URL` | нет | `http://localhost:3000` | URL фронтенда (для ссылок в письмах) |

## Разработка

### Режим разработки (с моками)

Frontend работает с mock данными — не требует backend:

```bash
cd frontend
npm install
npm run dev
```

### Полный стек (с backend)

```bash
# Терминал 1: Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=home_finance -p 5432:5432 postgres:16-alpine
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/home_finance
alembic upgrade head
uvicorn app.main:app --reload

# Терминал 2: Frontend
cd frontend
npm run dev
```

### Тесты

```bash
# Backend тесты (auth, CRUD, доходы/расходы, аналитика, бюджеты, OCR, обучение, валидация, upload, rate limiter)
# Запуск в Docker контейнере:
docker compose exec -e DEBUG=true backend python -m pytest tests/ -v

# Или локально (нужен PostgreSQL или SQLite):
cd backend
pip install -r requirements-dev.txt
DEBUG=true pytest -v
```

### Postman-коллекция

Коллекция находится в `postman_collection.json`. Требует запущенного Docker-стека (`docker compose up`).

Первый запрос коллекции (`Reset server state (debug)`) вызывает `POST /api/debug/reset` — сбрасывает in-memory rate limiter и brute-force счётчики перед прогоном. Это позволяет запускать коллекцию неограниченное количество раз подряд без фэйлов из-за накопленного состояния.

> **Важно:** сервер должен быть запущен с `DEBUG=true` (задан в `.env` по умолчанию). В production `DEBUG=false`, и эндпоинт `/api/debug/reset` возвращает 404.

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI приложение, middleware, логирование
│   │   ├── config.py            # Настройки с валидацией (env, auto cookie_secure)
│   │   ├── database.py          # Подключение к БД (pool_pre_ping, pool_recycle)
│   │   ├── rate_limiter.py      # Rate limiting middleware (глобальный + per-prefix)
│   │   ├── cache.py             # TTL-кэш аналитики с автоинвалидацией
│   │   ├── models.py            # SQLAlchemy модели
│   │   ├── schemas.py           # Pydantic схемы (sanitization, validation)
│   │   ├── routers/
│   │   │   ├── auth.py          # Регистрация, вход, выход, brute force защита
│   │   │   ├── transactions.py  # CRUD + аналитика + экспорт (expense/income)
│   │   │   ├── upload.py        # Загрузка скриншотов и Excel (magic byte validation)
│   │   │   └── budgets.py       # Бюджеты (bulk SQL queries)
│   │   ├── dependencies.py      # get_current_user
│   │   ├── schemas_auth.py      # Auth схемы (password max 72, username pattern)
│   │   └── services/
│   │       ├── auth_service.py  # JWT (PyJWT), bcrypt
│   │       ├── ocr_service.py   # Gemini Vision через OpenRouter (retry + backoff)
│   │       ├── excel_service.py # Парсинг банковских выписок Excel
│   │       ├── learning_service.py  # Обучение категоризации
│   │       ├── email_service.py     # SMTP: сброс пароля
│   │       ├── audit_service.py     # Аудит-лог операций
│   │       └── merchant_normalization.py
│   ├── alembic/                 # Миграции БД
│   ├── tests/                   # pytest (~280 тестов)
│   │   ├── conftest.py          # Фикстуры (in-memory SQLite)
│   │   ├── test_auth.py         # Auth, data isolation
│   │   ├── test_transactions.py # CRUD, поиск, фильтры, CSV
│   │   ├── test_budgets.py      # Бюджеты CRUD + статус
│   │   ├── test_analytics.py    # AI accuracy, тренды, прогноз
│   │   ├── test_services.py     # OCR parsing, merchant norm, learning
│   │   ├── test_upload.py       # Magic bytes, file validation
│   │   ├── test_rate_limiter.py # Rate limiter, chart parsing
│   │   ├── test_error_scenarios.py # Edge cases, xlsx export, image resize
│   │   ├── test_audit.py        # Аудит-лог операций
│   │   ├── test_email.py        # Email сервис (SMTP)
│   │   ├── test_password_reset.py  # Сброс пароля
│   │   ├── test_csrf.py         # CSRF защита
│   │   ├── test_crypto.py       # PII шифрование
│   │   └── test_e2e.py          # E2E integration
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── api/                 # API клиент и моки
│   │   ├── components/          # React компоненты
│   │   ├── contexts/            # AuthContext
│   │   ├── hooks/               # React Query хуки
│   │   ├── pages/               # Страницы
│   │   ├── types/               # TypeScript типы, MONTH_NAMES
│   │   ├── registerSW.ts        # PWA Service Worker
│   │   ├── queryClient.ts       # React Query клиент (retry + backoff)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── icons/               # PWA иконки
│   │   └── offline.html         # Офлайн-страница
│   ├── Dockerfile
│   ├── nginx.conf               # CSP, HSTS, Permissions-Policy headers, proxy
│   └── vite.config.ts
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── docker-compose.yml           # Оркестрация (read-only, resource limits)
├── .github/workflows/ci.yml    # CI пайплайн (lint + test)
├── ROADMAP.md
└── README.md
```

## API

### Аутентификация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register` | Регистрация (email, username, password) |
| POST | `/api/auth/login` | Вход (login, password). Rate limited (configurable) |
| POST | `/api/auth/logout` | Выход (очистка cookie) |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля (отправляет письмо) |
| POST | `/api/auth/reset-password` | Сброс пароля по токену |

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/transactions` | Создать транзакцию (expense/income) |
| GET | `/api/transactions` | Список (пагинация, поиск, фильтры, type) |
| GET | `/api/transactions/{id}` | Получить по ID |
| PUT | `/api/transactions/{id}` | Обновить |
| DELETE | `/api/transactions/{id}` | Удалить |
| DELETE | `/api/transactions` | Удалить все (с фильтром по type) |
| GET | `/api/transactions/reports/monthly` | Отчёт по месяцам |
| GET | `/api/transactions/analytics/comparison` | Сравнение месяцев |
| GET | `/api/transactions/analytics/trends` | Тренды расходов |
| GET | `/api/transactions/analytics/forecast` | Прогноз |
| GET | `/api/transactions/analytics/ai-accuracy` | Точность AI |
| GET | `/api/transactions/export` | Экспорт в CSV |
| GET | `/api/transactions/export/xlsx` | Экспорт в Excel (.xlsx) |

### Загрузка

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить и распознать скриншот или Excel выписку |
| POST | `/api/upload/parse-only` | Только распознать |
| POST | `/api/upload/batch` | Пакетная загрузка (до 10) |

### Бюджеты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/budgets` | Создать бюджет |
| GET | `/api/budgets` | Список бюджетов |
| GET | `/api/budgets/status` | Статус бюджетов (с расчётом расходов) |
| PUT | `/api/budgets/{id}` | Обновить |
| DELETE | `/api/budgets/{id}` | Удалить |

## Тестирование API (Postman)

Два Postman collection в папке `postman/`:
- `Home_Finance_Strict_Tests.postman_collection.json` — 55 запросов, strict validation
- `Home_Finance_Brutal_Tests.postman_collection.json` — расширенная версия с edge-case тестами

1. **Импортируйте:** Postman → File → Import → выбрать collection
2. **Запускайте папки по порядку**

**Collection включает:**
- Strict response shape validation на каждый endpoint
- Idempotent — безопасно запускать многократно (уникальные credentials на каждый запуск)
- Покрытие: auth, CRUD (расходы + доходы), аналитика, бюджеты, upload, валидация (422/404), auth protection (401)

## Документация

| Документ | Описание |
|----------|----------|
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Функциональные и нефункциональные требования |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, стек, схемы потоков данных |
| [API.md](docs/API.md) | REST API с примерами |
| [ROADMAP.md](ROADMAP.md) | План развития |
| [Postman Collections](postman/) | Strict + Brutal тесты API |

## Лицензия

MIT
