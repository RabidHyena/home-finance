from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:postgres@db:5432/home_finance"

    # Anthropic API
    anthropic_api_key: str = ""

    # Upload settings
    upload_dir: str = "/app/uploads"
    max_upload_size: int = 10 * 1024 * 1024  # 10MB

    # App settings
    debug: bool = False

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
