"""
System Configuration Module.
Defines system-wide environment variables and app settings.
"""
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "YAG - Smart Novel Writing Platform"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "yag"
    
    # Redis & RabbitMQ Settings
    REDIS_HOST: str = "localhost"
    RABBITMQ_HOST: str = "localhost"
    
    # Security Settings
    SECRET_KEY: str = "yag_development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # VNPAY Sandbox Settings
    VNP_TMN_CODE: str = "YAGTEST1"
    VNP_HASH_SECRET: str = "YAGDEVSECRETKEY12345678"
    VNP_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNP_RETURN_URL: str = "http://localhost:3000/payment-result"
    VNP_API_URL: str = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"

    # AI Engine
    GEMINI_API_KEY: str = ""

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
