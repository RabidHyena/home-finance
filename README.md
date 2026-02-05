# Home Finance

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

- Загрузка скриншотов банковских приложений (одиночная и пакетная до 10 штук)
- AI-распознавание суммы, описания, даты и категории (Gemini 3 Flash через OpenRouter)
- Авто-категоризация с обучением на исправлениях пользователя
- CRUD транзакций с поиском, фильтрами по датам и категориям
- Мультивалютность (RUB, USD, EUR, GBP)
- Экспорт в CSV
- Бюджеты по категориям с уведомлениями о превышении
- Аналитика: сравнение месяцев, тренды, прогнозирование
- Отчёты с интерактивными графиками (Recharts)
- PWA: установка на устройство, офлайн-режим, кеширование
- Адаптивный интерфейс (mobile + desktop)
- REST API с Swagger UI документацией

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Recharts, vite-plugin-pwa |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| AI | Google Gemini 3 Flash Preview через OpenRouter |
| Containers | Docker, Docker Compose |

## Быстрый старт

### 1. Настроить переменные окружения

```bash
cp .env.example .env
# Отредактируйте .env и добавьте ваш OPENROUTER_API_KEY
```

### 2. Запустить в Docker

```bash
docker-compose up --build
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
| `DEBUG` | нет | `false` | Режим отладки |

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
# Backend (111 тестов: CRUD, аналитика, бюджеты, OCR, обучение, валидация)
cd backend
DATABASE_URL="sqlite:///:memory:" pytest -v

# Frontend E2E (требует запущенный стек)
cd frontend
npm run test:e2e
```

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI приложение
│   │   ├── config.py            # Настройки (env)
│   │   ├── database.py          # Подключение к БД
│   │   ├── models.py            # SQLAlchemy модели
│   │   ├── schemas.py           # Pydantic схемы
│   │   ├── routers/
│   │   │   ├── transactions.py  # CRUD + аналитика
│   │   │   ├── upload.py        # Загрузка скриншотов
│   │   │   └── budgets.py       # Бюджеты
│   │   └── services/
│   │       ├── ocr_service.py   # Gemini Vision через OpenRouter
│   │       ├── learning_service.py  # Обучение категоризации
│   │       └── merchant_normalization.py
│   ├── alembic/                 # Миграции БД
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                 # API клиент и моки
│   │   ├── components/          # React компоненты
│   │   ├── hooks/               # React Query хуки
│   │   ├── pages/               # Страницы
│   │   ├── types/               # TypeScript типы
│   │   ├── registerSW.ts        # PWA Service Worker
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   ├── icons/               # PWA иконки
│   │   └── offline.html         # Офлайн-страница
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.ts
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── docker-compose.yml
├── ROADMAP.md
└── README.md
```

## API

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
| POST | `/api/upload` | Загрузить и распознать скриншот |
| POST | `/api/upload/parse-only` | Только распознать |
| POST | `/api/upload/batch` | Пакетная загрузка (до 10) |

### Бюджеты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/budgets` | Создать бюджет |
| GET | `/api/budgets` | Список бюджетов |
| GET | `/api/budgets/status` | Статус бюджетов |
| PUT | `/api/budgets/{id}` | Обновить |
| DELETE | `/api/budgets/{id}` | Удалить |

## Документация

| Документ | Описание |
|----------|----------|
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Функциональные и нефункциональные требования |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, стек, схемы потоков данных |
| [API.md](docs/API.md) | REST API с примерами |
| [ROADMAP.md](ROADMAP.md) | План развития |

## Лицензия

MIT
