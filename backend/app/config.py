import warnings

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/home_finance"

    # OpenRouter API
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-3-flash-preview"

    # Upload settings
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB

    # Auth / JWT
    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24h
    cookie_name: str = "access_token"
    cookie_samesite: str = "lax"
    cookie_secure: bool | None = None  # auto: True when debug=False

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Rate limiting
    rate_limit_window: int = 60  # seconds
    rate_limit_max_requests: int = 10  # per window

    # App settings
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env")

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, v: str) -> str:
        if not v.startswith(("postgresql://", "postgresql+psycopg2://", "sqlite://")):
            raise ValueError(
                "DATABASE_URL must start with postgresql:// or postgresql+psycopg2://"
            )
        return v

    @field_validator("secret_key")
    @classmethod
    def _validate_secret_key_length(cls, v: str) -> str:
        if v != "change-me-in-production" and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @field_validator("rate_limit_window")
    @classmethod
    def _validate_rate_limit_window(cls, v: int) -> int:
        if not 1 <= v <= 3600:
            raise ValueError("rate_limit_window must be between 1 and 3600 seconds")
        return v

    @field_validator("rate_limit_max_requests")
    @classmethod
    def _validate_rate_limit_max_requests(cls, v: int) -> int:
        if not 1 <= v <= 10000:
            raise ValueError("rate_limit_max_requests must be between 1 and 10000")
        return v

    @field_validator("access_token_expire_minutes")
    @classmethod
    def _validate_token_expire(cls, v: int) -> int:
        if not 5 <= v <= 43200:
            raise ValueError(
                "access_token_expire_minutes must be between 5 and 43200 (30 days)"
            )
        return v

    @model_validator(mode='after')
    def _set_cookie_secure_default(self) -> 'Settings':
        """Auto-set cookie_secure: True in production, False in debug."""
        if self.cookie_secure is None:
            self.cookie_secure = not self.debug
        return self


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.secret_key == "change-me-in-production" and not settings.debug:
        raise RuntimeError(
            "SECRET_KEY must be set to a secure random value in production. "
            "Set the SECRET_KEY environment variable or enable DEBUG mode."
        )
    if settings.secret_key == "change-me-in-production" and settings.debug:
        warnings.warn(
            "Using default SECRET_KEY — not safe for production!",
            stacklevel=2,
        )
    if not settings.openrouter_api_key:
        warnings.warn(
            "OPENROUTER_API_KEY is not set — OCR features will not work!",
            stacklevel=2,
        )
    return settings
