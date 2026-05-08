# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend

```bash
# Install deps
cd backend && pip install -r requirements-dev.txt

# Run dev server (requires PostgreSQL)
cd backend && uvicorn app.main:app --reload

# Lint
cd backend && ruff check app/ tests/

# Run all tests (spins up a PostgreSQL container via testcontainers — requires Docker)
cd backend && DEBUG=true pytest -v

# Run a single test file
cd backend && DEBUG=true pytest tests/test_auth.py -v

# Run a single test by name
cd backend && DEBUG=true pytest tests/test_auth.py::test_login -v

# Run with an existing PostgreSQL instance (skip testcontainers)
cd backend && DEBUG=true TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/home_finance pytest -v

# Apply DB migrations
cd backend && alembic upgrade head
```

### Frontend

```bash
# Dev server with mock API (no backend needed)
cd frontend && npm run dev

# Type check
cd frontend && npx tsc --noEmit

# Lint
cd frontend && npx eslint src/ --max-warnings 0

# Unit tests (vitest)
cd frontend && npm test

# E2E tests (requires full Docker stack running)
cd frontend && npm run test:e2e
```

### Full stack

```bash
# Start everything
docker compose up --build

# Run backend tests inside Docker
docker compose exec -e DEBUG=true backend python -m pytest tests/ -v
```

## Architecture

### Overview

React 19 + TypeScript SPA → FastAPI backend → PostgreSQL. The frontend proxies `/api/*` through Vite dev server (or nginx in production) to the backend on `:8000`. Images are uploaded, resized via Pillow, and sent to Google Gemini 3 Flash (via OpenRouter) for OCR/parsing.

### Backend (`backend/app/`)

- **`main.py`** — wires FastAPI app: CORS, `RateLimitMiddleware`, CSRF middleware, request logging middleware, global exception handler. The rate limiter uses `JSONResponse(429)` directly rather than raising `HTTPException` — this is intentional because Python 3.12 + Starlette converts unhandled `HTTPException` to `ExceptionGroup`, which crashes the process. `X-CSRF-Token` is included in `allow_headers` so cross-origin preflight requests succeed.
- **`config.py`** — single `Settings` object via `get_settings()`. `cookie_secure` is auto-set from `DEBUG`. `SECRET_KEY` raises `RuntimeError` at startup if unset in production. Default JWT TTL is 60 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES`). `CORS_ORIGINS` must be set for any split-host deployment.
- **`models.py`** — SQLAlchemy models: `User`, `Transaction`, `Budget`, `CategoryCorrection`, `MerchantCategoryMapping`, `PasswordResetToken`, `AuditLog`. All user-owned models carry `user_id` FK — every query filters by it for data isolation. `Transaction.image_path` is server-set only (populated by the upload service, never accepted from client API requests).
- **`schemas.py`** — Pydantic schemas with `_SanitizationMixin` stripping null bytes, HTML tags, and control characters from string fields. `amount` is constrained `ge=0.01, le=9999999999`; dates validated to 2000–2100. `TransactionCreate` does not accept `image_path` — that field is set server-side only.
- **`routers/`** — four routers: `auth`, `transactions`, `upload`, `budgets`. Analytics endpoints (comparison, trends, forecast, ai-accuracy) live inside `transactions.py`. Cached results via `cache.py` TTL cache, invalidated on any write. Search filters apply only to `description` (not `raw_text`, which is encrypted).
- **`services/ocr_service.py`** — calls OpenRouter with `temperature=0`; uses `JSONDecoder.raw_decode()` (not regex) to extract JSON from the response; retries once on parse failure.
- **`services/learning_service.py`** — builds `MerchantCategoryMapping` from user corrections (threshold: 3+ corrections, 70% agreement). Applied during OCR parsing.
- **`services/audit_service.py`** — writes audit log entries using a savepoint (`db.begin_nested()`) so a flush failure rolls back only the audit entry without corrupting the caller's transaction.
- **`crypto.py`** — Fernet symmetric encryption for PII fields (`raw_text`, `image_path`) with key derived from `SECRET_KEY` via HKDF-SHA256. Legacy plaintext values (no `gAAAAA` prefix) are returned as-is; key-mismatch failures return `None`.
- **`rate_limiter.py`** — in-memory limiter: 100 rpm global, 10 rpm for `/api/upload`. Auth endpoints add brute-force lockout (5 failures → 15 min). **Single-worker only** — counters are process-local; replace with a shared backend (Redis) before enabling `--workers N`.

### Frontend (`frontend/src/`)

- **`api/client.ts`** — single `api` object covering all endpoints. `USE_MOCK` is driven by `VITE_USE_MOCK=true` env var (default off). Mock mode uses in-memory arrays without any network calls. All mutating requests include `X-CSRF-Token` header read from the `csrf_token` cookie.
- **`contexts/AuthContext.tsx`** — auth state via React Query. Dispatches `auth:unauthorized` DOM event on 401, which `AuthContext` listens to for automatic logout. `queryClient` is defined in `queryClient.ts` (separate file) to avoid circular imports with `App.tsx`.
- **`hooks/`** — React Query hooks wrapping `api.*`. Cache `staleTime` is 5 minutes.
- Styling is **inline styles + CSS variables** — no CSS framework, no Tailwind, no CSS modules.

### CSRF flow

On login the backend sets two cookies: `access_token` (httpOnly, JWT) and `csrf_token` (JS-readable). Every state-mutating request must include `X-CSRF-Token: <csrf_token value>`. The middleware skips: `GET/HEAD/OPTIONS`, unauthenticated requests (no `access_token` cookie), and the exempt path list in `main.py`.

### Tests

Backend tests use real PostgreSQL 16. `conftest.py` checks `TEST_DATABASE_URL` first — if set, connects directly (used by CI and `docker compose exec`); otherwise spins up a container via `testcontainers` (requires Docker Desktop locally, Python 3.12+). Tables are created once per session; each test gets isolation via `TRUNCATE ... RESTART IDENTITY CASCADE` (faster and avoids lock contention vs drop/create per test). `DEBUG=true` is required to bypass the `SECRET_KEY` production check. The production Docker image does not include pytest — tests run on the host or in CI.

### Environment variables

Copy `.env.example` to `.env`. Required for running the full stack: `OPENROUTER_API_KEY`, `SECRET_KEY`, `POSTGRES_PASSWORD` (change before any non-local deployment). Set `DEBUG=true` in development (relaxes cookie security and allows the default `SECRET_KEY`).

For split-host deployments (frontend and backend on different origins): set `CORS_ORIGINS` to a comma-separated list of allowed frontend origins. Without this, browser preflight requests will be blocked.

### Key files for common tasks

| Task | File |
|------|------|
| Add a transaction category | `frontend/src/types/index.ts` |
| Change mock data | `frontend/src/api/mockData.ts` |
| Add a backend endpoint | `backend/app/routers/` + register in `main.py` |
| Add a DB model | `backend/app/models.py` → create Alembic migration |
| Modify input validation/sanitization | `backend/app/schemas.py` |
