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

    # Redis Settings
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # RabbitMQ Settings
    RABBITMQ_URL: Optional[str] = None
    RABBITMQ_HOST: str = "localhost"
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str = "guest"
    RABBITMQ_PASSWORD: str = "guest"

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_COVER_FOLDER: str = "yag/covers"

    # Security Settings
    SECRET_KEY: str = "yag_development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # VNPAY Sandbox Settings
    VNP_TMN_CODE: str = "YAGTEST1"
    VNP_HASH_SECRET: str = "YAGDEVSECRETKEY12345678"
    VNP_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNP_RETURN_URL: str = "http://localhost:3000/payment-result"
    VNP_API_URL: str = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"

    # AI Engine & Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    GEMINI_MAX_OUTPUT_TOKENS: int = 1024
    GEMINI_TIMEOUT_SECONDS: float = 10.0
    AI_CONTEXT_WORD_LIMIT: int = 1000

    # Scheduler Settings
    SCHEDULER_ENABLED: bool = True
    SCHEDULE_SCAN_HOUR_UTC: int = 17
    SCHEDULE_SCAN_MINUTE_UTC: int = 5

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"


settings = Settings()

