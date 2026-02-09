# API Documentation

Base URL: `http://localhost:8000`

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
- `400 Bad Request` - Email or username already exists
- `422 Unprocessable Entity` - Password too short (min 8 chars)

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
- `401 Unauthorized` - Invalid credentials

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
- `401 Unauthorized` - Not authenticated

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
  "ai_category": "Food",
  "ai_confidence": 0.95,
  "image_path": null,
  "raw_text": null
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "amount": 1500.00,
  "description": "Пятёрочка",
  "category": "Food",
  "currency": "RUB",
  "ai_category": "Food",
  "ai_confidence": 0.95,
  "date": "2026-01-15T14:30:00",
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
| category | string | null | Filter by category |
| search | string | null | Search in description and raw_text (case-insensitive) |
| date_from | datetime | null | Filter by start date |
| date_to | datetime | null | Filter by end date |

**Example:**
```
GET /api/transactions?page=1&per_page=10&category=Food&search=пятёрочка
```

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
      "date": "2026-01-15T14:30:00",
      "image_path": null,
      "raw_text": null,
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
  "currency": "USD"
}
```

**Response:** `200 OK` / `404 Not Found`

---

#### DELETE /api/transactions/{id}

Delete a transaction.

**Response:** `204 No Content` / `404 Not Found`

---

#### GET /api/transactions/reports/monthly

Get monthly spending reports with category breakdown.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| year | integer | null | Filter by year |

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

Export transactions to CSV. Supports the same filters as GET /api/transactions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | Filter by category |
| search | string | Search in description |
| date_from | datetime | Start date |
| date_to | datetime | End date |

**Response:** `200 OK`
- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename=transactions_YYYY-MM-DD.csv`
- Includes UTF-8 BOM for Excel compatibility

---

### Analytics

#### GET /api/transactions/analytics/comparison

Compare spending between two consecutive months.

**Query Parameters (required):**
| Parameter | Type | Description |
|-----------|------|-------------|
| year | integer | Year of the target month |
| month | integer | Target month (1-12) |

**Response:** `200 OK`
```json
{
  "current_month": {"year": 2026, "month": 1},
  "previous_month": {"year": 2025, "month": 12},
  "current": {
    "total": 10000,
    "count": 3,
    "by_category": {"Food": 7000, "Transport": 2000, "Shopping": 1000}
  },
  "previous": {
    "total": 8000,
    "count": 2,
    "by_category": {"Food": 5000, "Transport": 3000}
  },
  "changes": {
    "total_percent": 25.0
  }
}
```

---

#### GET /api/transactions/analytics/trends

Get spending trends over time with linear regression.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| months | integer | 6 | Number of months to analyze |

**Response:** `200 OK`
```json
{
  "period": "6 months",
  "data": [...],
  "trend_line": [...],
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
| history_months | integer | 6 | Months of history to use |
| forecast_months | integer | 3 | Months to forecast |

**Response:** `200 OK`
```json
{
  "historical": [...],
  "forecast": [
    {
      "year": 2026, "month": 2,
      "amount": 5500,
      "is_forecast": true,
      "confidence_min": 4500,
      "confidence_max": 6500
    }
  ],
  "statistics": {
    "average": 5500,
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

Upload a bank screenshot and parse transaction data using AI.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image file)

**Supported formats:** JPEG, PNG, GIF, WebP

**Max file size:** 10 MB

**Validation:**
- Content-Type must be `image/jpeg`, `image/png`, `image/gif`, or `image/webp`
- Magic byte validation (file content verified, not just extension)
- Max file size: 10 MB

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "amount": 1599.00,
      "description": "Лента",
      "date": "2026-01-15T14:30:00",
      "category": "Food",
      "raw_text": "...",
      "confidence": 0.92
    }
  ],
  "total_amount": 1599.00,
  "chart": null
}
```

---

#### POST /api/upload/parse-only

Parse a bank screenshot without saving the file. Same format as `/api/upload`.

---

#### POST /api/upload/batch

Upload multiple screenshots at once (up to 10).

**Request:**
- Content-Type: `multipart/form-data`
- Body: `files` (multiple image files)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "filename": "screen1.png",
      "status": "success",
      "data": {
        "transactions": [...],
        "total_amount": 5000.00,
        "chart": {
          "type": "pie",
          "categories": [
            {"name": "Food", "value": 3000, "percentage": 60},
            {"name": "Transport", "value": 2000, "percentage": 40}
          ],
          "total": 5000.00,
          "period": "2026-01",
          "period_type": "month",
          "confidence": 0.85
        }
      }
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

**Response:** `201 Created`
```json
{
  "id": 1,
  "category": "Food",
  "limit_amount": 15000,
  "period": "monthly",
  "created_at": "2026-01-15T10:00:00",
  "updated_at": "2026-01-15T10:00:00"
}
```

**Error:** `400 Bad Request` if budget for category already exists.

---

#### GET /api/budgets

Get all budgets.

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "category": "Food",
    "limit_amount": 15000,
    "period": "monthly"
  }
]
```

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
  "limit_amount": 20000
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
    "id": 1,
    "category": "Food",
    "limit_amount": 15000,
    "period": "monthly",
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
| amount | decimal | No | Transaction amount (must be > 0) |
| description | string | No | Merchant name or description |
| category | string | No | Category (default: "Other") |
| currency | string | No | Currency code: RUB, USD, EUR, GBP (default: "RUB") |
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
| category | string | No | Category (unique) |
| limit_amount | decimal | No | Spending limit (must be > 0) |
| period | string | No | "monthly" or "weekly" |
| created_at | datetime | No | Record creation time |
| updated_at | datetime | No | Last update time |

### ParsedTransaction

| Field | Type | Description |
|-------|------|-------------|
| amount | decimal | Recognized amount |
| description | string | Recognized merchant |
| date | datetime | Recognized date |
| category | string | Suggested category |
| raw_text | string | Raw AI response |
| confidence | float | Recognition confidence (0-1) |

### Category

Valid category values:
- `Food` - Еда
- `Transport` - Транспорт
- `Entertainment` - Развлечения
- `Shopping` - Покупки
- `Bills` - Счета
- `Health` - Здоровье
- `Other` - Другое

### Currency

Valid currency codes:
- `RUB` - Российский рубль (default)
- `USD` - Доллар США
- `EUR` - Евро
- `GBP` - Фунт стерлингов

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
| 404 | Not Found |
| 422 | Unprocessable Entity (validation error) |
| 401 | Unauthorized (not authenticated) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

---

## Rate Limiting

Authentication endpoints (`/api/auth/register`, `/api/auth/login`) are rate limited:
- **Window**: 60 seconds
- **Max requests**: 10 per IP per window
- **Response**: `429 Too Many Requests` when exceeded
- **Cleanup**: Automatic every 5 minutes, forced at 10,000 tracked IPs

---

## Examples

### cURL

**Register:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "user@example.com", "username": "myuser", "password": "password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"login": "user@example.com", "password": "password123"}'
```

**Create transaction (authenticated):**
```bash
curl -X POST http://localhost:8000/api/transactions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "amount": 1500.00,
    "description": "Пятёрочка",
    "category": "Food",
    "currency": "RUB",
    "date": "2026-01-15T14:30:00"
  }'
```

**Search transactions:**
```bash
curl -b cookies.txt \
  "http://localhost:8000/api/transactions?search=пятёрочка&category=Food&page=1&per_page=10"
```

**Upload screenshot:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -b cookies.txt \
  -F "file=@screenshot.png"
```

**Batch upload:**
```bash
curl -X POST http://localhost:8000/api/upload/batch \
  -b cookies.txt \
  -F "files=@screen1.png" \
  -F "files=@screen2.png"
```

**Export CSV:**
```bash
curl -b cookies.txt \
  -o transactions.csv "http://localhost:8000/api/transactions/export?category=Food"
```

**Create budget:**
```bash
curl -X POST http://localhost:8000/api/budgets \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"category": "Food", "limit_amount": 15000, "period": "monthly"}'
```

**Get budget status:**
```bash
curl -b cookies.txt \
  "http://localhost:8000/api/budgets/status?year=2026&month=1"
```

**Analytics - comparison:**
```bash
curl -b cookies.txt \
  "http://localhost:8000/api/transactions/analytics/comparison?year=2026&month=1"
```

**Analytics - trends:**
```bash
curl -b cookies.txt \
  "http://localhost:8000/api/transactions/analytics/trends?months=6"
```

**Analytics - forecast:**
```bash
curl -b cookies.txt \
  "http://localhost:8000/api/transactions/analytics/forecast?history_months=6&forecast_months=3"
```

---

*Version: 4.0*
*Date: 9 February 2026*
