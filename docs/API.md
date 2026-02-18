# API Documentation

Base URL: `http://localhost:3000` (nginx proxy → backend :8000)

Swagger UI: `http://localhost:8000/docs`

---

## Authentication

The API uses JWT authentication with httpOnly cookies. All endpoints except `/api/auth/*` require authentication.

### How it works

1. Register or login via `/api/auth/register` or `/api/auth/login`
2. Server sets `access_token` cookie (httpOnly, secure in production)
3. Cookie is automatically sent with all subsequent requests
4. Token expires in 24 hours

### Endpoints

#### POST /api/auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "myuser",
  "password": "securepassword123"
}
```

**Validation:**
- `email`: valid email, max 255 chars
- `username`: 3–100 chars, alphanumeric + `_`, `.`, `-` only (pattern: `^[a-zA-Z0-9_.-]+$`)
- `password`: 8–72 chars (bcrypt truncates at 72 bytes)

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "myuser",
  "created_at": "2026-02-06T10:00:00"
}
```

**Errors:**
- `400 Bad Request` — Email or username already exists
- `422 Unprocessable Entity` — Validation error (short password, invalid email, etc.)
- `429 Too Many Requests` — Rate limit exceeded

---

#### POST /api/auth/login

Authenticate and receive a session cookie.

**Request Body:**
```json
{
  "login": "user@example.com",
  "password": "securepassword123"
}
```

The `login` field accepts either email or username.

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "myuser",
  "created_at": "2026-02-06T10:00:00"
}
```

**Errors:**
- `401 Unauthorized` — Invalid credentials
- `429 Too Many Requests` — Rate limit exceeded

---

#### POST /api/auth/logout

Clear the session cookie.

**Response:** `200 OK`
```json
{
  "message": "Logged out"
}
```

---

#### GET /api/auth/me

Get the current authenticated user.

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "myuser",
  "created_at": "2026-02-06T10:00:00"
}
```

**Errors:**
- `401 Unauthorized` — Not authenticated

---

## Endpoints

### Health Check

#### GET /health

Check the health status of the API and database connection.

**Response:**
```json
{
  "status": "healthy",
  "database": "healthy",
  "version": "0.1.0"
}
```

---

### Transactions

All transaction endpoints support a `type` filter: `expense` or `income`. When omitted, returns all types.

#### POST /api/transactions

Create a new transaction.

**Request Body:**
```json
{
  "amount": 1500.00,
  "description": "Пятёрочка",
  "category": "Food",
  "date": "2026-01-15T14:30:00",
  "currency": "RUB",
  "type": "expense"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| amount | decimal | Yes | — | 0.01–9,999,999,999 |
| description | string | Yes | — | Max 500 chars |
| category | string | No | "Other" | Max 100 chars |
| date | datetime | Yes | — | Between year 2000–2100 |
| currency | string | No | "RUB" | RUB, USD, EUR, GBP |
| type | string | No | "expense" | "expense" or "income" |

**Response:** `201 Created`
```json
{
  "id": 1,
  "amount": 1500.00,
  "description": "Пятёрочка",
  "category": "Food",
  "currency": "RUB",
  "type": "expense",
  "date": "2026-01-15T14:30:00",
  "ai_category": null,
  "ai_confidence": null,
  "image_path": null,
  "raw_text": null,
  "created_at": "2026-01-15T14:35:00",
  "updated_at": "2026-01-15T14:35:00"
}
```

---

#### GET /api/transactions

Get a paginated list of transactions.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (1-based) |
| per_page | integer | 20 | Items per page (1-100) |
| type | string | null | Filter: "expense" or "income" |
| category | string | null | Filter by category |
| search | string | null | Search in description and raw_text (case-insensitive) |
| date_from | datetime | null | Filter by start date |
| date_to | datetime | null | Filter by end date |

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "amount": 1500.00,
      "description": "Пятёрочка",
      "category": "Food",
      "currency": "RUB",
      "type": "expense",
      "date": "2026-01-15T14:30:00",
      "created_at": "2026-01-15T14:35:00",
      "updated_at": "2026-01-15T14:35:00"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 10
}
```

---

#### GET /api/transactions/{id}

Get a single transaction by ID.

**Response:** `200 OK` / `404 Not Found`

---

#### PUT /api/transactions/{id}

Update an existing transaction. All fields are optional.

**Request Body:**
```json
{
  "amount": 1600.00,
  "description": "Магнит",
  "category": "Food",
  "currency": "USD",
  "type": "income"
}
```

**Response:** `200 OK` / `404 Not Found`

---

#### DELETE /api/transactions/{id}

Delete a transaction.

**Response:** `204 No Content` / `404 Not Found`

---

#### DELETE /api/transactions

Delete all transactions for the current user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Optional: delete only "expense" or "income" |

**Response:** `204 No Content`

---

#### GET /api/transactions/reports/monthly

Get monthly reports with category breakdown.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| year | integer | null | Filter by year |
| type | string | null | Filter: "expense" or "income" |

**Response:** `200 OK`
```json
[
  {
    "year": 2026,
    "month": 1,
    "total_amount": 30420.00,
    "transaction_count": 10,
    "by_category": {
      "Food": 2790.00,
      "Transport": 630.00,
      "Shopping": 19500.00
    }
  }
]
```

---

#### GET /api/transactions/export

Export transactions to CSV. Supports all filters from GET /api/transactions plus `type`.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter: "expense" or "income" |
| category | string | Filter by category |
| search | string | Search in description |
| date_from | datetime | Start date |
| date_to | datetime | End date |

**Response:** `200 OK`
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename=transactions_YYYYMMDD_HHMMSS.csv`
- Includes UTF-8 BOM for Excel compatibility

---

### Analytics

All analytics endpoints accept an optional `type` query parameter (`expense` or `income`).

#### GET /api/transactions/analytics/comparison

Compare spending between two consecutive months.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | integer | Yes | Year (2000-2100) |
| month | integer | Yes | Month (1-12) |
| type | string | No | "expense" or "income" |

**Response:** `200 OK`
```json
{
  "current_month": {"year": 2026, "month": 2},
  "previous_month": {"year": 2026, "month": 1},
  "current": {
    "total": 10000,
    "count": 3,
    "by_category": {"Food": 7000, "Transport": 2000}
  },
  "previous": {
    "total": 8000,
    "count": 2,
    "by_category": {"Food": 5000, "Transport": 3000}
  },
  "changes": {
    "total_percent": 25.0,
    "count_percent": 50.0,
    "by_category": [
      {"category": "Food", "current": 7000, "previous": 5000, "change_percent": 40.0}
    ]
  }
}
```

---

#### GET /api/transactions/analytics/trends

Get spending trends with linear regression.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| months | integer | 6 | Number of months (3-24) |
| type | string | null | "expense" or "income" |

**Response:** `200 OK`
```json
{
  "period": "6 months",
  "data": [
    {"year": 2026, "month": 1, "total": 5000, "count": 10}
  ],
  "trend_line": [5000, 5200, 5400],
  "statistics": {
    "average": 5500,
    "std_deviation": 1000,
    "min": 4000,
    "max": 7000
  }
}
```

---

#### GET /api/transactions/analytics/forecast

Forecast future spending based on historical data.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| history_months | integer | 6 | Months of history (3-12) |
| forecast_months | integer | 3 | Months to forecast (1-6) |
| type | string | null | "expense" or "income" |

**Response:** `200 OK`
```json
{
  "historical": [
    {"year": 2026, "month": 1, "amount": 5000, "is_forecast": false}
  ],
  "forecast": [
    {
      "year": 2026, "month": 3,
      "amount": 5500,
      "is_forecast": true,
      "confidence_min": 4500,
      "confidence_max": 6500
    }
  ],
  "statistics": {
    "average": 5500,
    "std_deviation": 1000,
    "confidence_interval": {"min": 4500, "max": 6500}
  }
}
```

---

#### GET /api/transactions/analytics/ai-accuracy

Get AI categorization accuracy statistics.

**Response:** `200 OK`
```json
{
  "total_predictions": 50,
  "correct_predictions": 42,
  "accuracy_percentage": 84.0,
  "learned_merchants": 5
}
```

---

### Upload

#### POST /api/upload

Upload a bank screenshot or Excel statement and parse transaction data using AI.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image or Excel file)

**Supported formats:** JPEG, PNG, GIF, WebP, Excel (.xlsx, .xls)

**Max file size:** 10 MB

**Validation:**
- Magic byte validation (file content verified, not just extension)
- Excel: PK or OLE2 magic bytes
- Images: JPEG/PNG/GIF/WebP signatures

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "amount": 1599.00,
      "description": "Лента",
      "date": "2026-01-15T14:30:00",
      "category": "Food",
      "type": "expense",
      "currency": "RUB",
      "raw_text": "...",
      "confidence": 0.92
    }
  ],
  "total_amount": 1599.00,
  "raw_text": "...",
  "chart": null
}
```

---

#### POST /api/upload/parse-only

Parse a bank screenshot without saving it (image only).

---

#### POST /api/upload/batch

Upload multiple files at once (up to 10).

**Request:**
- Content-Type: `multipart/form-data`
- Body: `files` (multiple files)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "filename": "screen1.png",
      "status": "success",
      "data": { "transactions": [...], "total_amount": 5000.00, "raw_text": "..." }
    }
  ],
  "total_files": 1,
  "successful": 1,
  "failed": 0
}
```

---

### Budgets

#### POST /api/budgets

Create a budget for a category.

**Request Body:**
```json
{
  "category": "Food",
  "limit_amount": 15000,
  "period": "monthly"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| category | string | Yes | Max 100 chars |
| limit_amount | decimal | Yes | Must be > 0 |
| period | string | No | "monthly" (default) or "weekly" |

**Response:** `201 Created`

**Error:** `400 Bad Request` if budget for category already exists.

---

#### GET /api/budgets

Get all budgets.

**Response:** `200 OK` — array of BudgetResponse

---

#### GET /api/budgets/{id}

Get a budget by ID.

**Response:** `200 OK` / `404 Not Found`

---

#### PUT /api/budgets/{id}

Update a budget. All fields are optional.

**Request Body:**
```json
{
  "limit_amount": 20000,
  "period": "weekly"
}
```

**Response:** `200 OK` / `404 Not Found`

---

#### DELETE /api/budgets/{id}

Delete a budget.

**Response:** `204 No Content` / `404 Not Found`

---

#### GET /api/budgets/status

Get budget status with current spending for a given month.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| year | integer | current year | Year |
| month | integer | current month | Month (1-12) |

**Response:** `200 OK`
```json
[
  {
    "budget": {
      "id": 1,
      "category": "Food",
      "limit_amount": 15000,
      "period": "monthly",
      "created_at": "...",
      "updated_at": "..."
    },
    "spent": 8500,
    "remaining": 6500,
    "percentage": 56.7,
    "exceeded": false
  }
]
```

---

## Data Types

### Transaction

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | integer | No | Unique identifier |
| amount | decimal | No | Transaction amount (0.01–9,999,999,999) |
| description | string | No | Merchant name or description (max 500) |
| category | string | No | Category (default: "Other") |
| currency | string | No | Currency code: RUB, USD, EUR, GBP |
| type | string | No | "expense" or "income" (default: "expense") |
| date | datetime | No | Transaction date and time |
| ai_category | string | Yes | AI-suggested category |
| ai_confidence | float | Yes | AI confidence (0.0-1.0) |
| image_path | string | Yes | Path to saved screenshot |
| raw_text | string | Yes | Raw AI response text |
| created_at | datetime | No | Record creation time |
| updated_at | datetime | No | Last update time |

### Budget

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | integer | No | Unique identifier |
| category | string | No | Category (unique per user) |
| limit_amount | decimal | No | Spending limit (> 0) |
| period | string | No | "monthly" or "weekly" |
| created_at | datetime | No | Record creation time |
| updated_at | datetime | No | Last update time |

### Expense Categories

| Code | Label (RU) | Color |
|------|-----------|-------|
| Food | Еда | #22c55e |
| Transport | Транспорт | #3b82f6 |
| Entertainment | Развлечения | #a855f7 |
| Shopping | Покупки | #f59e0b |
| Bills | Счета | #ef4444 |
| Health | Здоровье | #ec4899 |
| Other | Другое | #6b7280 |

### Income Categories

| Code | Label (RU) | Color |
|------|-----------|-------|
| Salary | Зарплата | #16a34a |
| Transfer | Переводы | #2563eb |
| Cashback | Кэшбэк | #d97706 |
| Investment | Инвестиции | #7c3aed |
| OtherIncome | Другое | #6b7280 |

### Currency

Valid currency codes: `RUB` (default), `USD`, `EUR`, `GBP`

---

## Error Handling

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (business logic error) |
| 401 | Unauthorized (not authenticated) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Input Validation & Sanitization

All transaction inputs are validated and sanitized:
- **Amount**: must be between `0.01` and `9,999,999,999`
- **Type**: must be `expense` or `income` (validated via `Literal` on all endpoints)
- **Date range**: must be between year 2000 and 2100
- **String sanitization**: null bytes, control characters, surrogates, and HTML tags are stripped from `description` and `category` (transactions and budgets)
- **Currency**: must be one of `RUB`, `USD`, `EUR`, `GBP`

---

## Rate Limiting

Authentication endpoints (`/api/auth/register`, `/api/auth/login`) are rate limited:
- **Window**: configurable via `RATE_LIMIT_WINDOW` env var (default: 60 seconds)
- **Max requests**: configurable via `RATE_LIMIT_MAX_REQUESTS` env var (default: 10 per IP; 100 in docker-compose)
- **Response**: `429 Too Many Requests` when exceeded

---

## Examples

### cURL

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"login": "admin@example.com", "password": "dev-admin-password-123"}'
```

**Create expense:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "amount": 1500.00,
    "description": "Пятёрочка",
    "category": "Food",
    "date": "2026-02-17T14:30:00",
    "type": "expense"
  }'
```

**Create income:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "amount": 150000,
    "description": "Зарплата",
    "category": "Salary",
    "date": "2026-02-10T10:00:00",
    "type": "income"
  }'
```

**Get expenses only:**
```bash
curl -b cookies.txt "http://localhost:3000/api/transactions?type=expense"
```

**Get income only:**
```bash
curl -b cookies.txt "http://localhost:3000/api/transactions?type=income"
```

**Monthly reports for income:**
```bash
curl -b cookies.txt "http://localhost:3000/api/transactions/reports/monthly?type=income"
```

**Upload screenshot:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -b cookies.txt \
  -F "file=@screenshot.png"
```

**Upload Excel statement:**
```bash
curl -X POST http://localhost:3000/api/upload \
  -b cookies.txt \
  -F "file=@statement.xlsx"
```

**Export expenses CSV:**
```bash
curl -b cookies.txt \
  -o expenses.csv "http://localhost:3000/api/transactions/export?type=expense"
```

---

## Postman Collection

Two Postman collections are available in the `postman/` directory:
- **Strict Tests** — 55 requests across 8 folders, strict response shape validation
- **Brutal Tests** — extended edge-case testing (rate limits, XSS, overflow, etc.)

Both collections are **idempotent** — safe to run multiple times (unique credentials generated per run via `Date.now()`).

Import into Postman and run folders in order.

---

*Version: 7.0*
*Date: 18 February 2026*
