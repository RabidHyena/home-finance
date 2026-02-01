# Home Finance (Домашняя Бухгалтерия)

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

- Загрузка скриншотов банковских приложений
- AI-распознавание суммы, описания и даты транзакции (Claude Vision)
- CRUD операции с транзакциями
- Отчёты по месяцам и категориям
- Интерактивные графики (круговая диаграмма, столбчатые графики)
- Адаптивный интерфейс (работает на мобильных)
- REST API с автодокументацией (Swagger UI)

## Технологии

| Компонент | Технология |
|-----------|------------|
| Frontend | React 19, TypeScript, TailwindCSS, Recharts |
| Backend | Python 3.12, FastAPI, SQLAlchemy |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude Vision API |
| Containers | Docker, Docker Compose |

## Быстрый старт

### 1. Настроить переменные окружения

```bash
cd home-finance
cp .env.example .env
# Отредактируйте .env и добавьте ваш ANTHROPIC_API_KEY
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

## Скриншоты

### Главная страница
- Сводка расходов за месяц
- Быстрые действия (добавить, отчёты)
- Последние транзакции

### Загрузка скриншота
- Drag-n-drop загрузка
- AI распознавание
- Редактирование данных

### Отчёты
- Графики по месяцам
- Круговая диаграмма по категориям
- Детализация расходов

## Разработка

### Режим разработки (с моками)

Frontend работает с mock данными — не требует backend:

```bash
cd frontend
npm install
npm run dev
```

Открыть http://localhost:3000

### Полный стек (с backend)

```bash
# Терминал 1: Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=home_finance -p 5432:5432 postgres:16-alpine
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/home_finance
uvicorn app.main:app --reload

# Терминал 2: Frontend
cd frontend
npm run dev
```

### Тесты

```bash
# Backend
cd backend
pytest

# Frontend (добавить позже)
cd frontend
npm test
```

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI приложение
│   │   ├── config.py         # Настройки
│   │   ├── database.py       # Подключение к БД
│   │   ├── models.py         # SQLAlchemy модели
│   │   ├── schemas.py        # Pydantic схемы
│   │   ├── routers/
│   │   │   ├── transactions.py
│   │   │   └── upload.py
│   │   └── services/
│   │       └── ocr_service.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # API клиент и моки
│   │   ├── components/       # React компоненты
│   │   ├── pages/            # Страницы приложения
│   │   ├── types/            # TypeScript типы
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── uploads/
├── docker-compose.yml
└── README.md
```

## API Endpoints

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/transactions` | Создать транзакцию |
| GET | `/api/transactions` | Список транзакций |
| GET | `/api/transactions/{id}` | Получить транзакцию |
| PUT | `/api/transactions/{id}` | Обновить транзакцию |
| DELETE | `/api/transactions/{id}` | Удалить транзакцию |
| GET | `/api/transactions/reports/monthly` | Отчёт по месяцам |

### Загрузка

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить и распознать |
| POST | `/api/upload/parse-only` | Только распознать |

## Документация

| Документ | Описание |
|----------|----------|
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | Функциональные и нефункциональные требования |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура системы, технологии, решения |
| [API.md](docs/API.md) | Документация REST API с примерами |
| [ROADMAP.md](ROADMAP.md) | План развития проекта |

## Лицензия

MIT
