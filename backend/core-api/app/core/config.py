from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Vetify Core API"
    DEBUG: bool = False

    DATABASE_URL: str
    DIRECT_URL: str = ""

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
