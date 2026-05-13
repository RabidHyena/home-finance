import logging
import logging.config
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.models import Transaction, Budget, User, AuditLog  # noqa: F401 - needed for table creation
from app.rate_limiter import RateLimitMiddleware
from app.routers import transactions, upload, budgets, auth
from app.schemas import HealthResponse

_DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes")

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"],
    },
    "loggers": {
        "uvicorn": {"level": "INFO"},
        "sqlalchemy.engine": {"level": "WARNING"},
        "app": {"level": "DEBUG" if _DEBUG else "INFO"},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Application starting up")
    yield
    # Shutdown: cleanup
    logger.info("Application shutting down — disposing DB connection pool")
    engine.dispose()
    # Clear auth rate limiter store
    from app.routers.auth import _auth_limiter
    _auth_limiter.clear()
    # Clear analytics cache
    from app.cache import analytics_cache
    analytics_cache.clear()
    logger.info("Shutdown complete")


settings = get_settings()

APP_VERSION = "0.1.0"

app = FastAPI(
    title="Home Finance API",
    description="API for personal finance tracking with AI-powered receipt parsing",
    version=APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
)

# Global rate limiting: configurable rpm default, 10 req/min for uploads
app.add_middleware(
    RateLimitMiddleware,
    default_rpm=settings.global_rate_limit_rpm,
    window=settings.rate_limit_window,
    prefix_limits={"/api/upload": 10},
)

_request_logger = logging.getLogger("app.requests")

_CSRF_EXEMPT_PATHS = {
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/reset-password",
    "/api/auth/csrf",
    "/health",
    "/api/debug/reset",
}


@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    """Double-submit cookie CSRF protection for authenticated state-mutating requests."""
    if request.method in ("GET", "HEAD", "OPTIONS") or request.url.path in _CSRF_EXEMPT_PATHS:
        return await call_next(request)

    # Only enforce CSRF for sessions that have an auth cookie — unauthenticated
    # requests will fail at the dependency level with 401, not here.
    if not request.cookies.get(settings.cookie_name):
        return await call_next(request)

    csrf_cookie = request.cookies.get("csrf_token", "")
    csrf_header = request.headers.get("X-CSRF-Token", "")

    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

    return await call_next(request)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log every request with duration and attach X-Request-ID."""
    request_id = str(uuid.uuid4())[:8]
    start = time.monotonic()

    response = await call_next(request)

    duration_ms = (time.monotonic() - start) * 1000
    response.headers["X-Request-ID"] = request_id

    log_level = logging.WARNING if duration_ms > 1000 else logging.INFO
    _request_logger.log(
        log_level,
        "%s %s %s %.0fms [%s]",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions, log traceback, return safe 500."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(upload.router)
app.include_router(budgets.router)


@app.get("/", tags=["root"])
def root():
    """Root endpoint."""
    return {"message": "Home Finance API", "docs": "/docs"}


@app.post("/api/debug/reset", tags=["debug"], include_in_schema=settings.debug)
def debug_reset():
    """Reset all in-memory rate limiters and brute-force state. Only available in DEBUG mode."""
    if not settings.debug:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not found")
    from app.rate_limiter import clear_all_limiters
    from app.routers.auth import _failed_logins, _failed_logins_lock
    from app.cache import analytics_cache
    clear_all_limiters()
    with _failed_logins_lock:
        _failed_logins.clear()
    analytics_cache.clear()
    return {"reset": True}


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check():
    """Health check endpoint."""
    # Check database connection
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return HealthResponse(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        version=APP_VERSION,
    )
