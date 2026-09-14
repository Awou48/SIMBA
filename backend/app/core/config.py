import os
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables / backend/.env."""

    model_config = SettingsConfigDict(env_file=os.path.join(BASE_DIR, ".env"), extra="ignore")

    PROJECT_NAME: str = "SIMBA API"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/simba_db"

    SECRET_KEY: str = "change-me-in-.env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    CORS_ORIGINS: List[str] = Field(default=["http://localhost:5173", "http://127.0.0.1:5173"])

    # Used by seed_db.py to bootstrap the first superadmin.
    FIRST_ADMIN_EMAIL: str = "admin@simba.id"
    FIRST_ADMIN_PASSWORD: str = "admin1234"
    FIRST_ADMIN_NAME: str = "SIMBA Admin"

    BASE_DIR: str = BASE_DIR
    DATA_DIR: str = os.path.join(BASE_DIR, "data")


settings = Settings()
