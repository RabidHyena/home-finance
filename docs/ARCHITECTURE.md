# Архитектура проекта "Домашняя Бухгалтерия"

## 1. Обзор системы

```
┌─────────────────────────────────────────────────────────────────┐
│                         ПОЛЬЗОВАТЕЛЬ                            │
│                    (браузер / мобильное устройство)             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript)                │
│                         localhost:3000                          │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  HomePage   │  │ UploadPage  │  │ ReportsPage │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │ API Client  │ ← Mock / Real API             │
│                   └─────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ REST API (JSON)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI + Python)                   │
│                         localhost:8000                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Routers                              │  │
│  │  ┌────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │  auth  │ │ transactions │ │  upload  │ │ budgets  │  │  │
│  │  │ router │ │    router    │ │  router  │ │  router  │  │  │
│  │  └────────┘ └──────────────┘ └──────────┘ └──────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Services                              │  │
│  │  ┌──────────┐ ┌────────────────┐ ┌────────────────┐      │  │
│  │  │   Auth   │ │  OCR Service   │ │   Learning    │      │  │
│  │  │ Service  │ │ (Gemini 3 via  │ │   Service    │      │  │
│  │  │ (JWT/bcrypt)│  OpenRouter)   │ │              │      │  │
│  │  └──────────┘ └────────────────┘ └────────────────┘      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Data Layer                              │  │
│  │  ┌────────────────┐  ┌────────────────┐                  │  │
│  │  │   SQLAlchemy   │  │    Pydantic    │                  │  │
│  │  │    Models      │  │    Schemas     │                  │  │
│  │  └────────────────┘  └────────────────┘                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL 16)                     │
│                         localhost:5432                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  users (email, username, hashed_password, ...)           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  transactions (user_id FK, amount, description, ...)     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  budgets (user_id FK, category, limit_amount, period)    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  category_corrections / merchant_category_mappings       │  │
│  │  (user_id FK for data isolation)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Call
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EXTERNAL: OpenRouter API (Google Gemini)           │
│                                                                 │
│  • Gemini 3 Flash Preview для распознавания изображений         │
│  • Модель: google/gemini-3-flash-preview                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Технологический стек

### 2.1 Frontend

| Технология | Версия | Назначение |
|------------|--------|------------|
| React | 19.x | UI библиотека |
| TypeScript | 5.x | Типизация |
| Vite | 7.x | Сборка и dev-сервер |
| TailwindCSS | 4.x | Стили |
| React Router | 7.x | Роутинг |
| React Query | 5.x | Кеширование запросов |
| Recharts | 3.x | Графики |
| Lucide React | 0.5x | Иконки |
| date-fns | 4.x | Работа с датами |

### 2.2 Backend

| Технология | Версия | Назначение |
|------------|--------|------------|
| Python | 3.12+ | Язык программирования |
| FastAPI | 0.115.x | Web framework |
| SQLAlchemy | 2.0.x | ORM |
| Pydantic | 2.9.x | Валидация данных |
| Uvicorn | 0.30.x | ASGI сервер |
| httpx | 0.27.x | HTTP клиент |
| OpenAI SDK | 1.x | OpenRouter API (совместимый клиент) |

### 2.3 Infrastructure

| Технология | Версия | Назначение |
|------------|--------|------------|
| PostgreSQL | 16 | База данных |
| Docker | 29.x | Контейнеризация |
| Docker Compose | 5.x | Оркестрация |
| nginx | alpine | Reverse proxy (production) |

---

## 3. Структура проекта

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
│   │   │   ├── auth.py          # Регистрация, вход, выход
│   │   │   ├── transactions.py  # CRUD + аналитика + экспорт
│   │   │   ├── upload.py        # Загрузка скриншотов
│   │   │   └── budgets.py       # Бюджеты
│   │   ├── dependencies.py      # get_current_user
│   │   ├── schemas_auth.py      # Auth Pydantic схемы
│   │   └── services/
│   │       ├── auth_service.py  # JWT, bcrypt, user CRUD
│   │       ├── ocr_service.py   # Gemini Vision через OpenRouter
│   │       ├── learning_service.py  # Обучение категоризации
│   │       └── merchant_normalization.py  # Нормализация названий
│   ├── alembic/                 # Миграции БД
│   ├── tests/
│   │   ├── conftest.py          # Фикстуры pytest
│   │   ├── test_transactions.py # Тесты CRUD, поиск, фильтры, валюта, экспорт
│   │   ├── test_e2e.py          # E2E тесты (lifecycle, pagination, validation)
│   │   ├── test_analytics.py    # Тесты AI accuracy, сравнение, тренды, прогноз
│   │   ├── test_budgets.py      # Тесты бюджетов CRUD + статус
│   │   └── test_services.py     # Тесты OCR, merchant normalization, learning
│   ├── Dockerfile
│   └── requirements.txt
│
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
│
├── docs/
│   ├── REQUIREMENTS.md          # Функциональные требования
│   ├── ARCHITECTURE.md          # Архитектура (этот файл)
│   ├── API.md                   # REST API документация
│   └── PHASE_4.5_PLAN.md       # План PWA (завершён)
│
├── docker-compose.yml           # Оркестрация контейнеров
├── .env.example                 # Шаблон переменных окружения
├── README.md                    # Быстрый старт
└── ROADMAP.md                   # План развития
```

---

## 4. Потоки данных

### 4.1 Загрузка и распознавание скриншота

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │ Frontend │    │ Backend  │    │OpenRouter│
│          │    │          │    │          │    │ (Gemini) │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ Drop image    │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ POST /api/upload              │
     │               │ (multipart/form-data)         │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ POST /v1/chat │
     │               │               │ (image+prompt)│
     │               │               │──────────────>│
     │               │               │               │
     │               │               │  JSON response│
     │               │               │<──────────────│
     │               │               │               │
     │               │ ParsedTransaction             │
     │               │<──────────────│               │
     │               │               │               │
     │ Show form     │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │ Submit        │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ POST /api/transactions        │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ INSERT INTO   │
     │               │               │ transactions  │
     │               │               │───────────────│
     │               │               │               │
     │               │ Transaction   │               │
     │               │<──────────────│               │
     │               │               │               │
     │ Success       │               │               │
     │<──────────────│               │               │
```

### 4.2 Получение отчётов

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │ Frontend │    │ Backend  │    │ Database │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ Open Reports  │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ GET /api/transactions/reports/monthly
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ SELECT        │
     │               │               │ SUM, COUNT    │
     │               │               │ GROUP BY      │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │ Aggregated    │
     │               │               │<──────────────│
     │               │               │               │
     │               │ MonthlyReport[]               │
     │               │<──────────────│               │
     │               │               │               │
     │ Render charts │               │               │
     │<──────────────│               │               │
```

---

## 5. Принятые решения

### 5.1 Почему FastAPI?

- Автоматическая генерация OpenAPI документации
- Встроенная валидация через Pydantic
- Асинхронная поддержка из коробки
- Высокая производительность
- Типизация Python

### 5.2 Почему React + TypeScript?

- Компонентный подход
- Большая экосистема
- TypeScript ловит ошибки на этапе компиляции
- Хорошая поддержка IDE

### 5.3 Почему PostgreSQL?

- Надёжность и ACID
- Поддержка сложных запросов
- Хорошо работает с SQLAlchemy
- Бесплатный и open-source

### 5.4 Почему Docker?

- Изоляция окружения
- Воспроизводимость
- Простой деплой
- Единая среда разработки и продакшена

### 5.5 Почему Mock API в Frontend?

- Независимая разработка UI
- Быстрое прототипирование
- Тестирование без backend
- Демонстрация без настройки

---

## 6. Безопасность

### 6.1 Текущие меры

| Мера | Реализация |
|------|------------|
| Authentication | JWT в httpOnly cookies (bcrypt, python-jose) |
| Data Isolation | user_id FK на всех моделях, фильтрация в запросах |
| SQL Injection | SQLAlchemy ORM (параметризованные запросы) |
| XSS | React автоматически экранирует |
| CORS | Настроен в FastAPI с credentials |
| CSRF | SameSite=Lax cookies |
| Валидация | Pydantic schemas |
| File Upload | Проверка MIME type, ограничение размера |

### 6.2 Планируемые меры

| Мера | Статус |
|------|--------|
| HTTPS | Планируется для production |
| Rate Limiting | Планируется |
| Input Sanitization | Планируется |

---

## 7. Масштабирование

### 7.1 Текущая архитектура (Single Server)

```
┌─────────────────────────────────────┐
│           Docker Host               │
│  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │Frontend │ │ Backend │ │  DB   │ │
│  │  :3000  │ │  :8000  │ │ :5432 │ │
│  └─────────┘ └─────────┘ └───────┘ │
└─────────────────────────────────────┘
```

### 7.2 Будущая архитектура (Scalable)

```
┌─────────────┐
│   Nginx     │ ← Load Balancer
│   / CDN     │
└──────┬──────┘
       │
┌──────┴──────┐
│             │
▼             ▼
┌───────┐ ┌───────┐
│Backend│ │Backend│ ← Horizontal scaling
│  #1   │ │  #2   │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
    ┌────┴────┐
    │   DB    │ ← PostgreSQL with replicas
    │ Primary │
    └─────────┘
```

---

## 8. Мониторинг и логирование

### 8.1 Текущее состояние

- `/health` endpoint для health checks
- Docker logs для просмотра логов
- Swagger UI для тестирования API

### 8.2 Планируется

- Structured logging (JSON)
- Prometheus metrics
- Grafana dashboards
- Error tracking (Sentry)

---

*Версия документа: 3.0*
*Дата: 6 февраля 2026*
