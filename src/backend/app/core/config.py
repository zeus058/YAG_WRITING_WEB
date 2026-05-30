"""
System Configuration Module.
Defines system-wide environment variables and app settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "YAG - Smart Novel Writing Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "yag"
    
    # Redis & RabbitMQ Settings
    REDIS_URL: Optional[str] = None
    RABBITMQ_URL: Optional[str] = None
    
    REDIS_HOST: str = "localhost"
    RABBITMQ_HOST: str = "localhost"

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_COVER_FOLDER: str = "yag/covers"
    
    # Security Settings
    SECRET_KEY: str = "yag_development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
