import os
from typing import List

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PLACEHOLDER_SECRET_KEY = "change-me-in-.env"
PLACEHOLDER_ADMIN_PASSWORD = "admin1234"


class Settings(BaseSettings):
    """Runtime configuration, loaded from environment variables / backend/.env."""

    model_config = SettingsConfigDict(env_file=os.path.join(BASE_DIR, ".env"), extra="ignore")

    PROJECT_NAME: str = "SIMBA API"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/simba_db"

    SECRET_KEY: str = PLACEHOLDER_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: List[str] = Field(default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8081", "http://127.0.0.1:8081"])
    CORS_ORIGIN_REGEX: str | None = None

    AUTO_SYNC_SCHEMA: bool = True

    FIRST_ADMIN_EMAIL: str = "admin@simba.id"
    FIRST_ADMIN_PASSWORD: str = PLACEHOLDER_ADMIN_PASSWORD
    FIRST_ADMIN_NAME: str = "SIMBA Admin"

    BASE_DIR: str = BASE_DIR
    DATA_DIR: str = os.path.join(BASE_DIR, "data")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @model_validator(mode="after")
    def _reject_development_defaults_in_production(self) -> "Settings":
        if not self.is_production:
            return self
        if self.SECRET_KEY == PLACEHOLDER_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set when ENVIRONMENT=production: tokens signed with the "
                "default key can be forged. Generate one with "
                'python -c "import secrets; print(secrets.token_hex(32))"'
            )
        if self.FIRST_ADMIN_PASSWORD == PLACEHOLDER_ADMIN_PASSWORD:
            raise ValueError(
                "FIRST_ADMIN_PASSWORD must be set when ENVIRONMENT=production: seed_db.py would "
                "otherwise create a superadmin with the documented default password"
            )
        return self


settings = Settings()
