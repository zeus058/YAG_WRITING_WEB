"""
System Configuration Module.
Defines system-wide environment variables and app settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import model_validator


LOCAL_URL_MARKERS = ("localhost", "127.0.0.1", "0.0.0.0", "::1")
VALID_SERVICE_ROLES = {"api", "worker", "migrate", "scheduler"}


def _looks_local(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in LOCAL_URL_MARKERS)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    PROJECT_NAME: str = "YAG - Smart Novel Writing Platform"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ENVIRONMENT: str = "development"
    SERVICE_ROLE: str = "api"
    QUEUE_PROVIDER: str = "rabbitmq"
    PAYMENT_PROVIDER: str = "vnpay"

    # PayOS Settings
    PAYOS_CLIENT_ID: Optional[str] = None
    PAYOS_API_KEY: Optional[str] = None
    PAYOS_CHECKSUM_KEY: Optional[str] = None
    PAYOS_RETURN_URL: Optional[str] = None

    # Database Settings
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "yag"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE_SECONDS: int = 1800

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
    RABBITMQ_MODERATION_QUEUE: str = "ai.moderation"
    RABBITMQ_MODERATION_RETRY_QUEUE: str = "ai.moderation.retry"
    RABBITMQ_MODERATION_DLQ: str = "ai.moderation.dlq"
    RABBITMQ_MODERATION_MAX_RETRIES: int = 5

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_COVER_FOLDER: str = "yag/covers"

    # Security Settings
    SECRET_KEY: str = "yag_development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALLOW_WEBSOCKET_QUERY_TOKEN: bool = True

    # VNPAY Sandbox Settings
    VNP_TMN_CODE: str = "YAGTEST1"
    VNP_HASH_SECRET: str = "YAGDEVSECRETKEY12345678"
    VNP_URL: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    VNP_RETURN_URL: str = "http://localhost:3000/payment/result"
    VNP_API_URL: str = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"

    # AI Engine & Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    GEMINI_MAX_OUTPUT_TOKENS: int = 1024
    GEMINI_TIMEOUT_SECONDS: float = 10.0
    AI_CONTEXT_WORD_LIMIT: int = 1000

    # Scheduler Settings
    SCHEDULER_ENABLED: bool = False
    SCHEDULE_SCAN_HOUR_UTC: int = 17
    SCHEDULE_SCAN_MINUTE_UTC: int = 5
    VIEW_COUNT_FLUSH_ENABLED: bool = False
    # Auto-create DB tables on startup (development only). Set to False in staging/production.
    AUTO_CREATE_TABLES: bool = False
    # If True, the app can automatically apply SQL files from migrations/ on startup (use carefully)
    APPLY_MIGRATIONS_ON_STARTUP: bool = False

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT not in {"development", "staging", "production"}:
            raise ValueError(f"Invalid ENVIRONMENT: {self.ENVIRONMENT}")
        if self.SERVICE_ROLE not in VALID_SERVICE_ROLES:
            raise ValueError(f"Invalid SERVICE_ROLE: {self.SERVICE_ROLE}")

        if self.ENVIRONMENT == "production":
            required_prod_vars = {
                "SECRET_KEY": "yag_development_secret_key_change_in_production",
            }
            if self.PAYMENT_PROVIDER == "vnpay":
                required_prod_vars["VNP_HASH_SECRET"] = "YAGDEVSECRETKEY12345678"
                required_prod_vars["VNP_TMN_CODE"] = "YAGTEST1"
            elif self.PAYMENT_PROVIDER == "payos":
                required_prod_vars["PAYOS_CLIENT_ID"] = None
                required_prod_vars["PAYOS_API_KEY"] = None
                required_prod_vars["PAYOS_CHECKSUM_KEY"] = None

            for var_name, default_val in required_prod_vars.items():
                val = getattr(self, var_name)
                if not val or val == default_val:
                    raise ValueError(
                        f"Field '{var_name}' must be explicitly set and different from default in production environment"
                    )

            essential_uris = {
                "CORS_ORIGINS",
                "DATABASE_URL",
                "REDIS_URL",
                "GEMINI_API_KEY",
            }
            if self.QUEUE_PROVIDER == "rabbitmq":
                essential_uris.add("RABBITMQ_URL")
            if self.PAYMENT_PROVIDER == "vnpay":
                essential_uris.add("VNP_URL")
                essential_uris.add("VNP_RETURN_URL")
                essential_uris.add("VNP_API_URL")

            for uri_name in essential_uris:
                val = getattr(self, uri_name)
                if not val:
                    raise ValueError(
                        f"Field '{uri_name}' must be explicitly set in production environment"
                    )

            for cloudinary_name in (
                "CLOUDINARY_CLOUD_NAME",
                "CLOUDINARY_API_KEY",
                "CLOUDINARY_API_SECRET",
            ):
                if not getattr(self, cloudinary_name):
                    raise ValueError(
                        f"Field '{cloudinary_name}' must be explicitly set in production environment"
                    )

            if self.ALLOW_WEBSOCKET_QUERY_TOKEN:
                raise ValueError("ALLOW_WEBSOCKET_QUERY_TOKEN must be false in production")

            if self.AUTO_CREATE_TABLES or self.APPLY_MIGRATIONS_ON_STARTUP:
                raise ValueError("Database schema mutation on app startup is disabled in production")

            if self.SCHEDULER_ENABLED and self.SERVICE_ROLE == "api":
                raise ValueError("SCHEDULER_ENABLED must be false in production API replicas; run scheduler as a separate job")

            if _looks_local(self.DATABASE_URL or ""):
                raise ValueError("DATABASE_URL must not point to localhost in production")
            if _looks_local(self.REDIS_URL or ""):
                raise ValueError("REDIS_URL must not point to localhost in production")
            if self.QUEUE_PROVIDER == "rabbitmq" and _looks_local(self.RABBITMQ_URL or ""):
                raise ValueError("RABBITMQ_URL must not point to localhost in production")
            if self.PAYMENT_PROVIDER == "vnpay":
                if _looks_local(self.VNP_RETURN_URL):
                    raise ValueError("VNP_RETURN_URL must not point to localhost in production")
                if not self.VNP_RETURN_URL.startswith("https://"):
                    raise ValueError("VNP_RETURN_URL must be HTTPS in production")
                if "sandbox" in self.VNP_URL.lower() or "sandbox" in self.VNP_API_URL.lower():
                    raise ValueError("Production VNPAY URLs must not point to sandbox endpoints")

            origins = _split_csv(self.CORS_ORIGINS)
            if not origins:
                raise ValueError("CORS_ORIGINS must include at least one production frontend origin")
            if any(origin == "*" or _looks_local(origin) for origin in origins):
                raise ValueError("CORS_ORIGINS must not include wildcard or localhost in production")
            if any(not origin.startswith("https://") for origin in origins):
                raise ValueError("CORS_ORIGINS must be HTTPS origins in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"


settings = Settings()
