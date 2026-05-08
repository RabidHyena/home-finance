# Home Finance

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

### Финансы
- Учёт расходов и доходов с раздельными категориями и фильтрацией
- CRUD транзакций: поиск, фильтры по датам, категориям и типу, пагинация
- Мультивалютность (RUB, USD, EUR, GBP)
- Бюджеты по категориям (месячные/недельные) с уведомлениями о превышении
- Экспорт в CSV и Excel (.xlsx)

### AI и загрузка
- AI-распознавание транзакций и диаграмм — Gemini 3 Flash через OpenRouter
- Загрузка скриншотов банковских приложений (одиночная и пакетная, до 10 штук)
- Импорт банковских выписок Excel (.xlsx, .xls)
- Авто-категоризация с обучением на исправлениях пользователя
- Автоматическое сжатие изображений при загрузке (max 2048px, Pillow)

### Аналитика
- Сравнение месяцев, тренды (линейная регрессия), прогнозирование
- Интерактивные графики (Recharts): линейные, круговые, сравнительные
- Метрики точности AI-категоризации

### Аутентификация и безопасность
- JWT в httpOnly cookies (bcrypt + PyJWT), сброс пароля по email
- CSRF защита (X-CSRF-Token + cookie double-submit)
- Rate limiting: глобальный 100 req/min, upload 10 req/min, brute force защита (5 попыток → 15 мин блокировка)
- Валидация всех входных данных: amount, date range, password (буква + цифра, max 72 байта), username pattern
- Санитизация строк (null bytes, HTML-теги, control chars), formula injection в CSV/XLSX
- Magic byte валидация загружаемых файлов
- Шифрование PII-полей в БД (AES-GCM, cryptography)
- Аудит-лог операций (login, register, create/update/delete транзакций)
- Security headers: CSP, HSTS, Permissions-Policy, X-Frame-Options

### Интерфейс и инфраструктура
- PWA: установка на устройство, офлайн-режим, кеширование
- Адаптивный дизайн (mobile + desktop)
- Структурированное логирование с request ID
- TTL-кэш аналитики с автоинвалидацией
- CI/CD: GitHub Actions (ruff, pytest, tsc, eslint, vitest)
- Docker: read-only FS, ограничение CPU/RAM, graceful shutdown

---

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Recharts, vite-plugin-pwa |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic, PyJWT, bcrypt |
| Database | PostgreSQL 16 |
| AI | Google Gemini 3 Flash через OpenRouter |
| Containers | Docker, Docker Compose, nginx |
| CI | GitHub Actions |

---

## Быстрый старт

### 1. Настройка окружения

```bash
cp .env.example .env
# Укажите OPENROUTER_API_KEY и SECRET_KEY
```

### 2. Запуск в Docker

```bash
docker compose up --build
```

### 3. Открыть приложение

| URL | Описание |
|-----|----------|
| http://localhost:3000 | Веб-интерфейс |
| http://localhost:8000 | Backend API |
| http://localhost:8000/docs | Swagger UI |

---

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|:---:|---|---|
| `OPENROUTER_API_KEY` | **да** | — | API ключ OpenRouter для AI-распознавания |
| `SECRET_KEY` | **да** | — | Ключ для JWT. В dev: `change-me-in-production` при `DEBUG=true`; в prod: случайная строка 32+ символов |
| `DATABASE_URL` | нет | `postgresql://postgres:postgres@db:5432/home_finance` | URL базы данных |
| `OPENROUTER_MODEL` | нет | `google/gemini-3-flash-preview` | Модель для OCR |
| `DEBUG` | нет | `false` | Режим отладки (разрешает default SECRET_KEY, отключает secure cookie) |
| `SEED_ADMIN_PASSWORD` | нет | `admin` | Пароль admin при первой миграции |
| `RATE_LIMIT_WINDOW` | нет | `60` | Окно rate limiter (секунды) |
| `RATE_LIMIT_MAX_REQUESTS` | нет | `100` (docker) / `10` | Максимум запросов на IP за окно |
| `SMTP_HOST` | нет | `""` | SMTP сервер (оставьте пустым для отключения email) |
| `SMTP_PORT` | нет | `587` | SMTP порт |
| `SMTP_USER` | нет | `""` | SMTP логин |
| `SMTP_PASSWORD` | нет | `""` | SMTP пароль |
| `SMTP_FROM` | нет | `""` | Email отправителя (обязателен при заданном `SMTP_HOST`) |
| `SMTP_TLS` | нет | `true` | Использовать STARTTLS |
| `FRONTEND_URL` | нет | `http://localhost:3000` | URL фронтенда (для ссылок в письмах) |

---

## Разработка

### Frontend с моками (без backend)

```bash
cd frontend
npm install
npm run dev
```

### Полный стек локально

```bash
# Терминал 1 — Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=home_finance -p 5432:5432 postgres:16-alpine
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/home_finance
alembic upgrade head
uvicorn app.main:app --reload

# Терминал 2 — Frontend
cd frontend
npm run dev
```

### Тесты

```bash
# В Docker (рекомендуется)
docker compose exec -e DEBUG=true backend python -m pytest tests/ -v

# Локально
cd backend
pip install -r requirements-dev.txt
DEBUG=true pytest -v
```

### Postman

Коллекция: `postman_collection.json` в корне репозитория. Требует запущенного Docker-стека.

Первый запрос (`Reset server state`) вызывает `POST /api/debug/reset` — сбрасывает rate limiter и brute-force счётчики, что позволяет запускать коллекцию многократно без накопленного состояния.

> `DEBUG=true` обязателен (выставлен в `.env` по умолчанию). В production эндпоинт `/api/debug/reset` возвращает 404.

---

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI приложение, middleware, логирование
│   │   ├── config.py            # Настройки (env, валидация, auto cookie_secure)
│   │   ├── database.py          # Подключение к БД (pool_pre_ping, pool_recycle)
│   │   ├── models.py            # SQLAlchemy модели
│   │   ├── schemas.py           # Pydantic схемы (валидация, санитизация)
│   │   ├── schemas_auth.py      # Auth схемы
│   │   ├── rate_limiter.py      # Rate limiting (глобальный + per-prefix)
│   │   ├── cache.py             # TTL-кэш аналитики
│   │   ├── crypto.py            # AES-GCM шифрование PII
│   │   ├── dependencies.py      # get_current_user
│   │   ├── routers/
│   │   │   ├── auth.py          # Регистрация, вход, выход, сброс пароля
│   │   │   ├── transactions.py  # CRUD, аналитика, экспорт (CSV + XLSX)
│   │   │   ├── upload.py        # Скриншоты и Excel (magic byte + resize)
│   │   │   └── budgets.py       # Бюджеты
│   │   └── services/
│   │       ├── auth_service.py          # JWT, bcrypt
│   │       ├── ocr_service.py           # Gemini Vision (retry + backoff)
│   │       ├── excel_service.py         # Парсинг банковских выписок
│   │       ├── learning_service.py      # Обучение категоризации
│   │       ├── merchant_normalization.py
│   │       ├── email_service.py         # SMTP
│   │       └── audit_service.py         # Аудит-лог
│   ├── alembic/                 # Миграции БД
│   ├── tests/                   # ~280 тестов
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_transactions.py
│   │   ├── test_budgets.py
│   │   ├── test_analytics.py
│   │   ├── test_services.py
│   │   ├── test_upload.py
│   │   ├── test_rate_limiter.py
│   │   ├── test_error_scenarios.py
│   │   ├── test_audit.py
│   │   ├── test_email.py
│   │   ├── test_password_reset.py
│   │   ├── test_csrf.py
│   │   ├── test_crypto.py
│   │   └── test_e2e.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/
│   │   ├── api/                 # API клиент и моки
│   │   ├── components/          # React компоненты
│   │   ├── contexts/            # AuthContext
│   │   ├── hooks/               # React Query хуки
│   │   ├── pages/               # Страницы приложения
│   │   ├── types/               # TypeScript типы
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── queryClient.ts
│   ├── public/
│   │   ├── icons/               # PWA иконки
│   │   └── offline.html
│   ├── Dockerfile
│   ├── nginx.conf               # Security headers, proxy
│   └── vite.config.ts
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── docker-compose.yml
├── .github/workflows/ci.yml
├── postman_collection.json
├── ROADMAP.md
└── README.md
```

---

## API (краткий справочник)

### Аутентификация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/auth/reset-password` | Сброс пароля по токену |

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/transactions` | Создать |
| GET | `/api/transactions` | Список (пагинация, поиск, фильтры) |
| GET | `/api/transactions/{id}` | По ID |
| PUT | `/api/transactions/{id}` | Обновить |
| DELETE | `/api/transactions/{id}` | Удалить |
| DELETE | `/api/transactions` | Удалить все (с фильтром по type) |
| GET | `/api/transactions/reports/monthly` | Отчёт по месяцам |
| GET | `/api/transactions/analytics/comparison` | Сравнение месяцев |
| GET | `/api/transactions/analytics/trends` | Тренды |
| GET | `/api/transactions/analytics/forecast` | Прогноз |
| GET | `/api/transactions/analytics/ai-accuracy` | Точность AI |
| GET | `/api/transactions/export` | Экспорт CSV |
| GET | `/api/transactions/export/xlsx` | Экспорт Excel |

### Загрузка

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить и распознать (скриншот или Excel) |
| POST | `/api/upload/parse-only` | Только распознать, без сохранения |
| POST | `/api/upload/batch` | Пакетная загрузка (до 10 файлов) |

### Бюджеты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/budgets` | Создать бюджет |
| GET | `/api/budgets` | Список бюджетов |
| GET | `/api/budgets/status` | Статус (траты vs лимиты) |
| PUT | `/api/budgets/{id}` | Обновить |
| DELETE | `/api/budgets/{id}` | Удалить |

### Системные

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI |

Подробная документация с примерами запросов и ответов — [docs/API.md](docs/API.md).

---

## Документация

| Документ | Описание |
|----------|----------|
| [docs/API.md](docs/API.md) | REST API с примерами запросов и ответов |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Функциональные и нефункциональные требования |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, стек, схемы потоков данных |
| [ROADMAP.md](ROADMAP.md) | История фаз разработки |

---

## Лицензия

MIT
