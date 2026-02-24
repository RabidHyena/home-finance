import logging
import logging.config
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.models import Transaction, Budget, User  # noqa: F401 - needed for table creation
from app.rate_limiter import RateLimitMiddleware
from app.routers import transactions, upload, budgets, auth
from app.schemas import HealthResponse

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
        "app": {"level": "DEBUG"},
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
    allow_headers=["Content-Type", "Authorization"],
)

# Global rate limiting: 100 req/min default, 10 req/min for uploads
app.add_middleware(
    RateLimitMiddleware,
    default_rpm=100,
    window=settings.rate_limit_window,
    prefix_limits={"/api/upload": 10},
)

_request_logger = logging.getLogger("app.requests")


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
