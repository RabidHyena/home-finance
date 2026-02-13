# Home Finance

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

- **Аутентификация**: регистрация, вход, JWT-токены в httpOnly cookies (bcrypt + PyJWT)
- **Мультипользовательность**: изоляция данных между пользователями (user_id FK)
- **Безопасность**: CORS, CSP headers, rate limiting (auth, configurable), magic byte валидация файлов, CSV sanitization, SECRET_KEY enforcement, input sanitization (null bytes, HTML, control chars), amount/date range validation
- Загрузка скриншотов банковских приложений (одиночная и пакетная до 10 штук)
- AI-распознавание транзакций и диаграмм (Gemini 3 Flash через OpenRouter)
- Авто-категоризация с обучением на исправлениях пользователя
- CRUD транзакций с поиском, фильтрами по датам и категориям
- Мультивалютность (RUB, USD, EUR, GBP)
- Экспорт в CSV
- Бюджеты по категориям (месячные/недельные) с уведомлениями о превышении
- Аналитика: сравнение месяцев, тренды, прогнозирование
- Отчёты с интерактивными графиками (Recharts)
- PWA: установка на устройство, офлайн-режим, кеширование
- Адаптивный интерфейс (mobile + desktop)
- REST API с Swagger UI документацией

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Recharts, Inline Styles (CSS Variables), vite-plugin-pwa |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic, PyJWT, bcrypt |
| Database | PostgreSQL 16 |
| AI | Google Gemini 3 Flash Preview через OpenRouter |
| Containers | Docker, Docker Compose, nginx |

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
| `SECRET_KEY` | **да** (prod) | `change-me-in-production` | Секретный ключ для JWT. В production обязателен (RuntimeError при запуске) |
| `DEBUG` | нет | `false` | Режим отладки (разрешает default SECRET_KEY, cookie_secure=false) |
| `SEED_ADMIN_PASSWORD` | нет | `admin` | Пароль admin пользователя при первой миграции |
| `RATE_LIMIT_WINDOW` | нет | `60` | Окно rate limiter в секундах |
| `RATE_LIMIT_MAX_REQUESTS` | нет | `100` (docker) / `10` (default) | Максимум запросов на IP за окно |

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
# Backend (157 тестов: auth, CRUD, аналитика, бюджеты, OCR, обучение, валидация, upload, rate limiter)
# Запуск в Docker контейнере:
docker compose exec -e DEBUG=true backend python -m pytest tests/ -v

# Или локально (нужен PostgreSQL или SQLite):
cd backend
pip install -r requirements-dev.txt
DEBUG=true pytest -v
```

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI приложение
│   │   ├── config.py            # Настройки (env, auto cookie_secure)
│   │   ├── database.py          # Подключение к БД
│   │   ├── models.py            # SQLAlchemy модели
│   │   ├── schemas.py           # Pydantic схемы (sanitization, validation)
│   │   ├── routers/
│   │   │   ├── auth.py          # Регистрация, вход, выход, configurable rate limiter
│   │   │   ├── transactions.py  # CRUD + аналитика + экспорт
│   │   │   ├── upload.py        # Загрузка скриншотов (magic byte validation)
│   │   │   └── budgets.py       # Бюджеты (bulk SQL queries)
│   │   ├── dependencies.py      # get_current_user
│   │   ├── schemas_auth.py      # Auth схемы
│   │   └── services/
│   │       ├── auth_service.py  # JWT (PyJWT), bcrypt
│   │       ├── ocr_service.py   # Gemini Vision через OpenRouter
│   │       ├── learning_service.py  # Обучение категоризации
│   │       └── merchant_normalization.py
│   ├── alembic/                 # Миграции БД
│   ├── tests/                   # 157 тестов (pytest)
│   │   ├── conftest.py          # Фикстуры (in-memory SQLite)
│   │   ├── test_auth.py         # Auth, data isolation
│   │   ├── test_transactions.py # CRUD, поиск, фильтры, CSV
│   │   ├── test_budgets.py      # Бюджеты CRUD + статус
│   │   ├── test_analytics.py    # AI accuracy, тренды, прогноз
│   │   ├── test_services.py     # OCR parsing, merchant norm, learning
│   │   ├── test_upload.py       # Magic bytes, file validation
│   │   ├── test_rate_limiter.py # Rate limiter, chart parsing
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
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── icons/               # PWA иконки
│   │   └── offline.html         # Офлайн-страница
│   ├── Dockerfile
│   ├── nginx.conf               # CSP headers, proxy
│   └── vite.config.ts
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── Home_Finance_API.postman_collection.json
├── docker-compose.yml
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

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/transactions` | Создать транзакцию |
| GET | `/api/transactions` | Список (пагинация, поиск, фильтры) |
| GET | `/api/transactions/{id}` | Получить по ID |
| PUT | `/api/transactions/{id}` | Обновить |
| DELETE | `/api/transactions/{id}` | Удалить |
| GET | `/api/transactions/reports/monthly` | Отчёт по месяцам |
| GET | `/api/transactions/analytics/comparison` | Сравнение месяцев |
| GET | `/api/transactions/analytics/trends` | Тренды расходов |
| GET | `/api/transactions/analytics/forecast` | Прогноз |
| GET | `/api/transactions/analytics/ai-accuracy` | Точность AI |
| GET | `/api/transactions/export` | Экспорт в CSV |

### Загрузка

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить и распознать скриншот (транзакции + диаграммы) |
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

## Документация

| Документ | Описание |
|----------|----------|
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Функциональные и нефункциональные требования |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, стек, схемы потоков данных |
| [API.md](docs/API.md) | REST API с примерами |
| [ROADMAP.md](ROADMAP.md) | План развития |
| [Postman Collection](docs/Home_Finance_API.postman_collection.json) | 64 запроса, 163 assertion, security tests |

## Лицензия

MIT
