# Home Finance (Домашняя Бухгалтерия)

Веб-приложение для учёта личных финансов с AI-распознаванием скриншотов банковских приложений.

## Возможности

- Загрузка скриншотов банковских приложений
- AI-распознавание суммы, описания и даты транзакции (Claude Vision)
- CRUD операции с транзакциями
- Отчёты по месяцам и категориям
- REST API с автодокументацией (Swagger UI)

## Технологии

| Компонент | Технология |
|-----------|------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude Vision API |
| Containers | Docker, Docker Compose |

## Быстрый старт

### 1. Клонировать проект

```bash
cd home-finance
```

### 2. Настроить переменные окружения

```bash
cp .env.example .env
# Отредактируйте .env и добавьте ваш ANTHROPIC_API_KEY
```

### 3. Запустить в Docker

```bash
docker-compose up --build
```

### 4. Открыть API

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## API Endpoints

### Транзакции

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/transactions` | Создать транзакцию |
| GET | `/api/transactions` | Список транзакций (с пагинацией) |
| GET | `/api/transactions/{id}` | Получить транзакцию |
| PUT | `/api/transactions/{id}` | Обновить транзакцию |
| DELETE | `/api/transactions/{id}` | Удалить транзакцию |
| GET | `/api/transactions/reports/monthly` | Отчёт по месяцам |

### Загрузка скриншотов

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/upload` | Загрузить и распознать скриншот |
| POST | `/api/upload/parse-only` | Распознать без сохранения |

## Примеры запросов

### Создать транзакцию

```bash
curl -X POST http://localhost:8000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1500.00,
    "description": "Пятёрочка",
    "category": "Food",
    "date": "2024-01-15T14:30:00"
  }'
```

### Загрузить скриншот

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@screenshot.png"
```

### Получить транзакции

```bash
curl http://localhost:8000/api/transactions?page=1&per_page=20
```

### Отчёт по месяцам

```bash
curl http://localhost:8000/api/transactions/reports/monthly?year=2024
```

## Разработка

### Локальный запуск (без Docker)

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Установить зависимости
pip install -r requirements.txt

# Запустить PostgreSQL (например, через Docker)
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=home_finance -p 5432:5432 postgres:16-alpine

# Настроить переменные
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/home_finance
export ANTHROPIC_API_KEY=your_key

# Запустить сервер
uvicorn app.main:app --reload
```

### Запуск тестов

```bash
cd backend
pip install pytest pytest-asyncio
pytest
```

## Структура проекта

```
home-finance/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI приложение
│   │   ├── config.py         # Настройки
│   │   ├── database.py       # Подключение к БД
│   │   ├── models.py         # SQLAlchemy модели
│   │   ├── schemas.py        # Pydantic схемы
│   │   ├── routers/
│   │   │   ├── transactions.py  # CRUD транзакций
│   │   │   └── upload.py        # Загрузка скриншотов
│   │   └── services/
│   │       └── ocr_service.py   # AI распознавание
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── uploads/                  # Загруженные скриншоты
├── docker-compose.yml
├── .env.example
└── README.md
```

## Лицензия

MIT
