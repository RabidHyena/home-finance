# Roadmap: План дальнейших действий

## Текущий статус

**Фаза 0 ✓** — Окружение настроено
**Фаза 1 ✓** — Backend MVP готов

## Что реализовано

### Backend (Фаза 1)
- [x] Структура проекта FastAPI
- [x] Модели данных (SQLAlchemy)
- [x] Pydantic схемы для валидации
- [x] CRUD API для транзакций
- [x] Пагинация и фильтрация
- [x] Месячные отчёты по категориям
- [x] Сервис OCR (Claude Vision API)
- [x] Загрузка скриншотов
- [x] Docker и docker-compose
- [x] Базовые тесты
- [x] Документация

---

## Фаза 2: Фронтенд (следующий шаг)

### 2.1 Базовая структура
- [ ] Создать проект Vite + React + TypeScript
- [ ] Настроить TailwindCSS
- [ ] Настроить React Router
- [ ] Создать базовый layout (Header, Navigation)

### 2.2 API клиент
- [ ] Настроить axios/fetch для запросов к backend
- [ ] Типизировать все API ответы
- [ ] Добавить React Query для кеширования

### 2.3 Страницы
- [ ] **HomePage** — дашборд с последними транзакциями
- [ ] **UploadPage** — загрузка скриншота + форма редактирования
- [ ] **TransactionsPage** — список всех транзакций с фильтрами
- [ ] **ReportsPage** — графики и отчёты

### 2.4 Компоненты
- [ ] `TransactionCard` — карточка транзакции
- [ ] `TransactionForm` — форма создания/редактирования
- [ ] `UploadZone` — drag-n-drop загрузка файлов
- [ ] `MonthlyChart` — график трат по месяцам
- [ ] `CategoryPieChart` — круговая диаграмма по категориям

### 2.5 Docker
- [ ] Dockerfile для frontend
- [ ] Добавить nginx для раздачи статики
- [ ] Обновить docker-compose

---

## Фаза 3: Интеграция и улучшения

### 3.1 Интеграция
- [ ] Настроить nginx как reverse proxy
- [ ] Объединить frontend и backend в docker-compose
- [ ] Настроить CORS для production

### 3.2 Улучшения Backend
- [ ] Добавить аутентификацию (JWT)
- [ ] Добавить миграции (Alembic)
- [ ] Логирование
- [ ] Rate limiting

### 3.3 Улучшения Frontend
- [ ] Адаптивный дизайн (mobile-first)
- [ ] PWA (offline mode)
- [ ] Темная тема
- [ ] Уведомления

---

## Фаза 4: Продвинутые функции

### 4.1 AI улучшения
- [ ] Автоматическая категоризация (без выбора пользователя)
- [ ] Обучение на исправлениях пользователя
- [ ] Распознавание нескольких транзакций на одном скриншоте

### 4.2 Аналитика
- [ ] Тренды расходов (сравнение месяцев)
- [ ] Прогноз расходов
- [ ] Бюджеты с уведомлениями

### 4.3 Интеграции
- [ ] Экспорт в CSV/Excel
- [ ] Telegram бот для быстрого добавления
- [ ] Синхронизация между устройствами

---

## Как продолжить

### Следующий шаг: Создание Frontend

```bash
# Перейти в директорию проекта
cd home-finance

# Создать frontend проект
npm create vite@latest frontend -- --template react-ts

# Перейти в frontend
cd frontend

# Установить зависимости
npm install
npm install -D tailwindcss postcss autoprefixer
npm install react-router-dom @tanstack/react-query axios

# Настроить Tailwind
npx tailwindcss init -p
```

### Команды для работы

```bash
# Запустить всё в Docker
docker-compose up --build

# Только backend
docker-compose up backend db

# Запустить тесты
cd backend && pytest

# Посмотреть логи
docker-compose logs -f backend
```

---

## Полезные ссылки

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [React Query](https://tanstack.com/query/latest)
- [Anthropic API](https://docs.anthropic.com/)
