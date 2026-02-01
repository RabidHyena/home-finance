# API Documentation

Base URL: `http://localhost:8000`

Swagger UI: `http://localhost:8000/docs`

---

## Authentication

Currently, the API does not require authentication. JWT authentication is planned for future releases.

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
  "date": "2024-01-15T14:30:00",
  "image_path": null,
  "raw_text": null
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "amount": "1500.00",
  "description": "Пятёрочка",
  "category": "Food",
  "date": "2024-01-15T14:30:00",
  "image_path": null,
  "raw_text": null,
  "created_at": "2024-01-15T14:35:00",
  "updated_at": "2024-01-15T14:35:00"
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
| date_from | datetime | null | Filter by start date |
| date_to | datetime | null | Filter by end date |

**Example:**
```
GET /api/transactions?page=1&per_page=10&category=Food
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": 1,
      "amount": "1500.00",
      "description": "Пятёрочка",
      "category": "Food",
      "date": "2024-01-15T14:30:00",
      "image_path": null,
      "raw_text": null,
      "created_at": "2024-01-15T14:35:00",
      "updated_at": "2024-01-15T14:35:00"
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

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Transaction ID |

**Response:** `200 OK`
```json
{
  "id": 1,
  "amount": "1500.00",
  "description": "Пятёрочка",
  "category": "Food",
  "date": "2024-01-15T14:30:00",
  "image_path": null,
  "raw_text": null,
  "created_at": "2024-01-15T14:35:00",
  "updated_at": "2024-01-15T14:35:00"
}
```

**Error Response:** `404 Not Found`
```json
{
  "detail": "Transaction not found"
}
```

---

#### PUT /api/transactions/{id}

Update an existing transaction.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Transaction ID |

**Request Body:** (all fields optional)
```json
{
  "amount": 1600.00,
  "description": "Магнит",
  "category": "Food",
  "date": "2024-01-15T15:00:00"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "amount": "1600.00",
  "description": "Магнит",
  "category": "Food",
  "date": "2024-01-15T15:00:00",
  "image_path": null,
  "raw_text": null,
  "created_at": "2024-01-15T14:35:00",
  "updated_at": "2024-01-15T15:05:00"
}
```

---

#### DELETE /api/transactions/{id}

Delete a transaction.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Transaction ID |

**Response:** `204 No Content`

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
    "year": 2024,
    "month": 1,
    "total_amount": "30420.00",
    "transaction_count": 10,
    "by_category": {
      "Food": "2790.00",
      "Transport": "630.00",
      "Entertainment": "2500.00",
      "Shopping": "19500.00",
      "Bills": "3200.00",
      "Health": "1800.00"
    }
  }
]
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

**Example (curl):**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@screenshot.png"
```

**Response:** `200 OK`
```json
{
  "amount": 1599.00,
  "description": "Лента",
  "date": "2024-01-15T14:30:00",
  "category": "Food",
  "raw_text": "Распознано: Лента, 1599.00 руб",
  "confidence": 0.92
}
```

**Error Response:** `400 Bad Request`
```json
{
  "detail": "Invalid file type. Allowed: image/jpeg, image/png, image/gif, image/webp"
}
```

---

#### POST /api/upload/parse-only

Parse a bank screenshot without saving the file.

Same request/response format as `/api/upload`.

---

## Data Types

### Transaction

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | integer | No | Unique identifier |
| amount | decimal | No | Transaction amount |
| description | string | No | Merchant name or description |
| category | string | Yes | Category (Food, Transport, etc.) |
| date | datetime | No | Transaction date and time |
| image_path | string | Yes | Path to saved screenshot |
| raw_text | string | Yes | Raw AI response text |
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

### MonthlyReport

| Field | Type | Description |
|-------|------|-------------|
| year | integer | Report year |
| month | integer | Report month (1-12) |
| total_amount | decimal | Total spending |
| transaction_count | integer | Number of transactions |
| by_category | object | Spending by category |

### Category

Valid category values:
- `Food` - Еда
- `Transport` - Транспорт
- `Entertainment` - Развлечения
- `Shopping` - Покупки
- `Bills` - Счета
- `Health` - Здоровье
- `Other` - Другое

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
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 422 | Unprocessable Entity (validation error) |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently not implemented. Planned for future releases.

---

## Examples

### cURL

**Create transaction:**
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

**Get transactions:**
```bash
curl "http://localhost:8000/api/transactions?page=1&per_page=10"
```

**Upload screenshot:**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@screenshot.png"
```

### JavaScript/TypeScript

```typescript
// Get transactions
const response = await fetch('http://localhost:8000/api/transactions');
const data = await response.json();
console.log(data.items);

// Create transaction
const newTransaction = await fetch('http://localhost:8000/api/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 1500,
    description: 'Пятёрочка',
    category: 'Food',
    date: new Date().toISOString(),
  }),
});

// Upload file
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const parsed = await fetch('http://localhost:8000/api/upload', {
  method: 'POST',
  body: formData,
});
```

### Python

```python
import httpx

# Get transactions
response = httpx.get('http://localhost:8000/api/transactions')
transactions = response.json()

# Create transaction
response = httpx.post(
    'http://localhost:8000/api/transactions',
    json={
        'amount': 1500.00,
        'description': 'Пятёрочка',
        'category': 'Food',
        'date': '2024-01-15T14:30:00',
    }
)

# Upload file
with open('screenshot.png', 'rb') as f:
    response = httpx.post(
        'http://localhost:8000/api/upload',
        files={'file': f}
    )
```

---

*Version: 1.0*
*Date: February 2026*
