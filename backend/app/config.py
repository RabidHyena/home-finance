from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/home_finance"

    # OpenRouter API
    openrouter_api_key: str = ""

    # Upload settings
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB

    # App settings
    debug: bool = False

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
