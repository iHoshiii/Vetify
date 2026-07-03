from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Vetify Core API"
    DEBUG: bool = False

    MONGODB_URI: str
    MONGODB_DB_NAME: str = "vetify"

    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
