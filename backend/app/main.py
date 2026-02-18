from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.database import engine
from app.models import Transaction, Budget, User  # noqa: F401 - needed for table creation
from app.routers import transactions, upload, budgets, auth
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Tables are managed by Alembic migrations (alembic upgrade head)
    yield
    # Shutdown: cleanup if needed


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
