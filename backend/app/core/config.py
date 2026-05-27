from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    APP_NAME: str = "DataVis Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15

    DATABASE_URL: str
    SYNC_DATABASE_URL: str

    REDIS_URL: str = "redis://localhost:6379/0"

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    FRONTEND_URL: str = "http://localhost:3000"
    COOKIE_DOMAIN: str = "localhost"

    # Gmail SMTP
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_FROM_NAME: str = "DataVis Platform"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"

    # DuckDB
    DUCKDB_PATH: str =  "data/analytics.duckdb"
    DUCKDB_READ_ONLY:bool = False
    
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()