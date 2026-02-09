import warnings

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

    # App settings
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Auto-set cookie_secure: True in production, False in debug
    if settings.cookie_secure is None:
        object.__setattr__(settings, "cookie_secure", not settings.debug)
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
    return settings
