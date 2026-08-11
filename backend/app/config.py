from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CloudSpend AI API"
    app_mode: str = "demo"
    aws_region: str = "us-east-1"
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    data_dir: Path = Path(__file__).resolve().parents[1] / "data"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
