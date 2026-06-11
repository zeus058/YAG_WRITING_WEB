"""
System Configuration Module.
Defines system-wide environment variables and app settings.
"""

from typing import Optional
from pydantic import ConfigDict, model_validator
from pydantic_settings import BaseSettings

LOCAL_URL_MARKERS = ("localhost", "127.0.0.1", "0.0.0.0", "::1")  # nosec B104
VALID_SERVICE_ROLES = {"api", "worker", "migrate", "scheduler"}
VALID_QUEUE_PROVIDERS = {"rabbitmq", "pubsub"}
INSECURE_SECRET_KEYS = {
    "dev_secret_key",
    "yag_development_secret_key_change_in_production",
}
PLACEHOLDER_VALUES = {
    "",
    "your_gemini_api_key_here",
    "your_payos_client_id_here",
    "your_payos_api_key_here",
    "your_payos_checksum_key_here",
    "your_cloudinary_cloud_name_here",
    "your_cloudinary_api_key_here",
    "your_cloudinary_api_secret_here",
    "your_cloud_name_here",
    "your_api_key_here",
    "your_api_secret_here",
}
INSECURE_DB_PASSWORDS = {"postgres", "yag_secret", ""}
INSECURE_RABBITMQ_CREDENTIALS = {
    ("guest", "guest"),
    ("yag_mq", "yag_mq_secret"),
}


def _looks_local(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in LOCAL_URL_MARKERS)


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore",
    )

    PROJECT_NAME: str = "YAG - Smart Novel Writing Platform"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ENVIRONMENT: str = "development"
    SERVICE_ROLE: str = "api"
    QUEUE_PROVIDER: str = "rabbitmq"
    PAYMENT_PROVIDER: str = "payos"

    # PayOS Settings
    PAYOS_CLIENT_ID: Optional[str] = None
    PAYOS_API_KEY: Optional[str] = None
    PAYOS_CHECKSUM_KEY: Optional[str] = None
    PAYOS_RETURN_URL: Optional[str] = None
    PAYOS_MOCK_ENABLED: bool = False

    # Security Settings
    SECRET_KEY: str = "yag_development_secret_key_change_in_production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALLOW_WEBSOCKET_QUERY_TOKEN: bool = True
    INTERNAL_TASK_TOKEN: Optional[str] = None
    INTERNAL_SERVICE_ACCOUNT_EMAIL: Optional[str] = None
    INTERNAL_AUTH_AUDIENCE: Optional[str] = None

    # AI Engine & Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_STRONG_MODEL: str = "gemini-2.5-pro"
    GEMINI_FAST_MODEL: str = "gemini-2.5-flash"
    GEMINI_MODERATION_MODEL: str = "gemini-2.5-pro"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    GEMINI_MAX_OUTPUT_TOKENS: int = 1024

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
    DB_CONNECT_TIMEOUT_SECONDS: int = 10
    DEMO_AUTHOR_PASSWORD: Optional[str] = None

    # Redis Settings
    REDIS_URL: Optional[str] = None
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None

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

    # Google Pub/Sub Settings (Cloud Run production queue option)
    GCP_PROJECT_ID: Optional[str] = None
    PUBSUB_PROJECT_ID: Optional[str] = None
    PUBSUB_MODERATION_TOPIC: Optional[str] = None

    # Cloudinary Settings
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    CLOUDINARY_COVER_FOLDER: str = "yag/covers"

    GEMINI_TIMEOUT_SECONDS: float = 10.0
    AI_CONTEXT_WORD_LIMIT: int = 1000
    AI_AGENT_ENABLED: bool = True
    AI_TOOL_TRACE_ENABLED: bool = False
    AI_MODERATION_STRICT_MODE: bool = True
    AI_MAX_CONTEXT_CHARS: int = 12000
    AI_AUTHOR_STYLE_CHAPTER_LIMIT: int = 12
    AI_RECOMMENDATION_CANDIDATE_LIMIT: int = 20
    AI_MODERATION_APPROVE_THRESHOLD: float = 0.72
    AI_MODERATION_REJECT_THRESHOLD: float = 0.82

    # Scheduler Settings
    SCHEDULER_ENABLED: bool = False
    SCHEDULE_SCAN_HOUR_UTC: int = 17
    SCHEDULE_SCAN_MINUTE_UTC: int = 5
    VIEW_COUNT_FLUSH_ENABLED: bool = False

    # SMTP settings for production password reset and schedule notifications
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 465
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None

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
        if self.QUEUE_PROVIDER not in VALID_QUEUE_PROVIDERS:
            raise ValueError(f"Invalid QUEUE_PROVIDER: {self.QUEUE_PROVIDER}")
        if self.AI_MAX_CONTEXT_CHARS < 1000:
            raise ValueError("AI_MAX_CONTEXT_CHARS must be at least 1000")
        if (
            self.AI_AUTHOR_STYLE_CHAPTER_LIMIT < 0
            or self.AI_AUTHOR_STYLE_CHAPTER_LIMIT > 50
        ):
            raise ValueError("AI_AUTHOR_STYLE_CHAPTER_LIMIT must be between 0 and 50")
        if self.AI_RECOMMENDATION_CANDIDATE_LIMIT < 5:
            raise ValueError(
                "AI_RECOMMENDATION_CANDIDATE_LIMIT must be at least 5"
            )
        for threshold_name in (
            "AI_MODERATION_APPROVE_THRESHOLD",
            "AI_MODERATION_REJECT_THRESHOLD",
        ):
            threshold = getattr(self, threshold_name)
            if threshold < 0.0 or threshold > 1.0:
                raise ValueError(f"{threshold_name} must be between 0.0 and 1.0")
        if self.AI_MODERATION_REJECT_THRESHOLD < self.AI_MODERATION_APPROVE_THRESHOLD:
            raise ValueError(
                "AI_MODERATION_REJECT_THRESHOLD must be greater than or equal to "
                "AI_MODERATION_APPROVE_THRESHOLD"
            )

        if self.ENVIRONMENT == "production":
            if (
                not self.SECRET_KEY
                or self.SECRET_KEY in INSECURE_SECRET_KEYS
                or len(self.SECRET_KEY) < 32
            ):
                raise ValueError(
                    "SECRET_KEY must be explicitly set to a strong production value"
                )

            required_prod_vars = {}
            if self.PAYMENT_PROVIDER == "payos":
                required_prod_vars["PAYOS_CLIENT_ID"] = None
                required_prod_vars["PAYOS_API_KEY"] = None
                required_prod_vars["PAYOS_CHECKSUM_KEY"] = None
                required_prod_vars["PAYOS_RETURN_URL"] = None

            for var_name, default_val in required_prod_vars.items():
                val = getattr(self, var_name)
                if (
                    not val
                    or val == default_val
                    or str(val).lower() in PLACEHOLDER_VALUES
                ):
                    raise ValueError(
                        f"Field '{var_name}' must be explicitly set and different "
                        "from default in production environment"
                    )

            essential_uris = {
                "CORS_ORIGINS",
                "GEMINI_API_KEY",
                "GEMINI_MODEL",
                "GEMINI_STRONG_MODEL",
                "GEMINI_FAST_MODEL",
                "GEMINI_MODERATION_MODEL",
                "GEMINI_EMBEDDING_MODEL",
            }

            for uri_name in essential_uris:
                val = getattr(self, uri_name)
                if not val or str(val).lower() in PLACEHOLDER_VALUES:
                    raise ValueError(
                        f"Field '{uri_name}' must be explicitly set in production environment"
                    )

            for cloudinary_name in (
                "CLOUDINARY_CLOUD_NAME",
                "CLOUDINARY_API_KEY",
                "CLOUDINARY_API_SECRET",
            ):
                cloudinary_value = getattr(self, cloudinary_name)
                if (
                    not cloudinary_value
                    or str(cloudinary_value).lower() in PLACEHOLDER_VALUES
                ):
                    raise ValueError(
                        f"Field '{cloudinary_name}' must be explicitly set in production environment"
                    )

            if self.PAYOS_MOCK_ENABLED:
                raise ValueError("PAYOS_MOCK_ENABLED must be false in production")

            if not self.SMTP_HOST or not self.SMTP_USER or not self.SMTP_PASSWORD:
                raise ValueError(
                    "SMTP_HOST, SMTP_USER, and SMTP_PASSWORD must be set in production"
                )

            if self.ALLOW_WEBSOCKET_QUERY_TOKEN:
                raise ValueError(
                    "ALLOW_WEBSOCKET_QUERY_TOKEN must be false in production"
                )

            if self.AUTO_CREATE_TABLES or self.APPLY_MIGRATIONS_ON_STARTUP:
                raise ValueError(
                    "Database schema mutation on app startup is disabled in production"
                )

            if self.SCHEDULER_ENABLED and self.SERVICE_ROLE == "api":
                raise ValueError(
                    "SCHEDULER_ENABLED must be false in production API replicas; run scheduler as a separate job"
                )

            if self.DATABASE_URL:
                if _looks_local(self.DATABASE_URL):
                    raise ValueError(
                        "DATABASE_URL must not point to localhost in production"
                    )
            else:
                if _looks_local(self.POSTGRES_SERVER):
                    raise ValueError(
                        "POSTGRES_SERVER must not point to localhost in production"
                    )
                if self.POSTGRES_PASSWORD in INSECURE_DB_PASSWORDS:
                    raise ValueError(
                        "POSTGRES_PASSWORD must be explicitly set to a non-default production value"
                    )

            if self.REDIS_URL:
                if _looks_local(self.REDIS_URL):
                    raise ValueError(
                        "REDIS_URL must not point to localhost in production"
                    )
            else:
                if _looks_local(self.REDIS_HOST):
                    raise ValueError(
                        "REDIS_HOST must not point to localhost in production"
                    )
                if not self.REDIS_PASSWORD:
                    raise ValueError(
                        "REDIS_PASSWORD must be set when REDIS_URL is not used in production"
                    )

            if self.QUEUE_PROVIDER == "rabbitmq":
                if self.RABBITMQ_URL and _looks_local(self.RABBITMQ_URL):
                    raise ValueError(
                        "RABBITMQ_URL must not point to localhost in production"
                    )
                if not self.RABBITMQ_URL and _looks_local(self.RABBITMQ_HOST):
                    raise ValueError(
                        "RABBITMQ_HOST must not point to localhost in production"
                    )
                if not self.RABBITMQ_URL and (
                    (
                        self.RABBITMQ_USER,
                        self.RABBITMQ_PASSWORD,
                    )
                    in INSECURE_RABBITMQ_CREDENTIALS
                    or not self.RABBITMQ_PASSWORD
                ):
                    raise ValueError(
                        "RabbitMQ credentials must be changed from development defaults in production"
                    )
            else:
                pubsub_project = self.PUBSUB_PROJECT_ID or self.GCP_PROJECT_ID
                if not pubsub_project:
                    raise ValueError(
                        "PUBSUB_PROJECT_ID or GCP_PROJECT_ID must be set when QUEUE_PROVIDER=pubsub"
                    )
                if not self.PUBSUB_MODERATION_TOPIC:
                    raise ValueError(
                        "PUBSUB_MODERATION_TOPIC must be set when QUEUE_PROVIDER=pubsub"
                    )
                has_static_token = (
                    self.INTERNAL_TASK_TOKEN is not None
                    and len(self.INTERNAL_TASK_TOKEN) >= 32
                )
                has_oidc_identity = bool(self.INTERNAL_SERVICE_ACCOUNT_EMAIL)
                if not has_static_token and not has_oidc_identity:
                    raise ValueError(
                        "INTERNAL_TASK_TOKEN or INTERNAL_SERVICE_ACCOUNT_EMAIL must be set when QUEUE_PROVIDER=pubsub"
                    )
                if self.INTERNAL_AUTH_AUDIENCE:
                    if _looks_local(self.INTERNAL_AUTH_AUDIENCE):
                        raise ValueError(
                            "INTERNAL_AUTH_AUDIENCE must not point to localhost in production"
                        )
                    if not self.INTERNAL_AUTH_AUDIENCE.startswith("https://"):
                        raise ValueError(
                            "INTERNAL_AUTH_AUDIENCE must be HTTPS in production"
                        )

            if self.PAYMENT_PROVIDER == "payos":
                if _looks_local(self.PAYOS_RETURN_URL or ""):
                    raise ValueError(
                        "PAYOS_RETURN_URL must not point to localhost in production"
                    )
                if not (self.PAYOS_RETURN_URL or "").startswith("https://"):
                    raise ValueError("PAYOS_RETURN_URL must be HTTPS in production")

            origins = _split_csv(self.CORS_ORIGINS)
            if not origins:
                raise ValueError(
                    "CORS_ORIGINS must include at least one production frontend origin"
                )
            if any(origin == "*" or _looks_local(origin) for origin in origins):
                raise ValueError(
                    "CORS_ORIGINS must not include wildcard or localhost in production"
                )
            if any(not origin.startswith("https://") for origin in origins):
                raise ValueError("CORS_ORIGINS must be HTTPS origins in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]


settings = Settings()
