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
│  │  ┌────────────────┐  ┌────────────────┐                  │  │
│  │  │  transactions  │  │     upload     │                  │  │
│  │  │    router      │  │     router     │                  │  │
│  │  └────────────────┘  └────────────────┘                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          │                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     Services                              │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │                  OCR Service                        │  │  │
│  │  │            (Claude Vision API)                      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
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
│  │                    transactions                           │  │
│  │  id | amount | description | category | date | ...        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Call
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 EXTERNAL: Anthropic Claude API                  │
│                                                                 │
│  • Claude Vision для распознавания изображений                  │
│  • Модель: claude-sonnet-4-20250514                              │
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
| Anthropic SDK | 0.34.x | Claude API |

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
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── config.py            # Settings (env variables)
│   │   ├── database.py          # Database connection
│   │   ├── models.py            # SQLAlchemy ORM models
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── transactions.py  # CRUD endpoints
│   │   │   └── upload.py        # File upload endpoints
│   │   └── services/
│   │       ├── __init__.py
│   │       └── ocr_service.py   # Claude Vision integration
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_transactions.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts        # API client (mock/real switch)
│   │   │   └── mockData.ts      # Mock data for development
│   │   ├── components/
│   │   │   ├── Layout.tsx       # App shell with navigation
│   │   │   ├── TransactionCard.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── UploadZone.tsx   # Drag-n-drop upload
│   │   │   ├── MonthlyChart.tsx
│   │   │   ├── CategoryChart.tsx
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── HomePage.tsx     # Dashboard
│   │   │   ├── UploadPage.tsx   # Screenshot upload flow
│   │   │   ├── TransactionsPage.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── App.tsx              # Router setup
│   │   ├── main.tsx             # Entry point
│   │   └── index.css            # Global styles
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── docs/
│   ├── REQUIREMENTS.md          # Functional requirements
│   ├── ARCHITECTURE.md          # This file
│   └── API.md                   # API documentation
│
├── uploads/                     # Uploaded screenshots storage
│   └── .gitkeep
│
├── docker-compose.yml           # Container orchestration
├── .env.example                 # Environment template
├── .gitignore
├── README.md                    # Quick start guide
└── ROADMAP.md                   # Development roadmap
```

---

## 4. Потоки данных

### 4.1 Загрузка и распознавание скриншота

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │    │ Frontend │    │ Backend  │    │ Claude   │
│          │    │          │    │          │    │ API      │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │
     │ Drop image    │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ POST /api/upload              │
     │               │ (multipart/form-data)         │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ POST /messages│
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
| SQL Injection | SQLAlchemy ORM (параметризованные запросы) |
| XSS | React автоматически экранирует |
| CORS | Настроен в FastAPI |
| Валидация | Pydantic schemas |
| File Upload | Проверка MIME type, ограничение размера |

### 6.2 Планируемые меры

| Мера | Статус |
|------|--------|
| HTTPS | Планируется для production |
| JWT Authentication | Планируется |
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

*Версия документа: 1.0*
*Дата: Февраль 2026*
