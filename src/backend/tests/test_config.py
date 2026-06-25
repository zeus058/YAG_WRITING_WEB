import pytest
from pydantic import ValidationError

from app.core.config import Settings


def production_config(**overrides):
    config = {
        "ENVIRONMENT": "production",
        "SERVICE_ROLE": "api",
        "SECRET_KEY": "prod_secret_key_with_more_than_32_chars",
        "PAYMENT_PROVIDER": "payos",
        "DATABASE_URL": "postgresql://user:strong-pass@db.prod.example.com:5432/yag",
        "REDIS_URL": "rediss://default:token@redis.prod.example.com:6379",
        "RABBITMQ_URL": "amqps://user:strong-pass@mq.prod.example.com/vhost",
        "CORS_ORIGINS": "https://yag.example.com",
        "GEMINI_API_KEY": "gemini-prod-key",
        "CLOUDINARY_CLOUD_NAME": "yag-prod",
        "CLOUDINARY_API_KEY": "cloudinary-key",
        "CLOUDINARY_API_SECRET": "cloudinary-secret",
        "PAYOS_CLIENT_ID": "payos-client-prod",
        "PAYOS_API_KEY": "payos-api-key-prod",
        "PAYOS_CHECKSUM_KEY": "payos-checksum-key-prod",
        "PAYOS_RETURN_URL": "https://yag.example.com/payment/result",
        "PAYOS_MOCK_ENABLED": False,
        "SMTP_HOST": "smtp.prod.example.com",
        "SMTP_USER": "noreply@yag.example.com",
        "SMTP_PASSWORD": "smtp-password-prod",
        "SMTP_FROM": "noreply@yag.example.com",
        "ALLOW_WEBSOCKET_QUERY_TOKEN": False,
        "AUTO_CREATE_TABLES": False,
        "APPLY_MIGRATIONS_ON_STARTUP": False,
        "SCHEDULER_ENABLED": False,
    }
    config.update(overrides)
    return config


def assert_config_rejected(overrides, message):
    with pytest.raises(ValidationError, match=message):
        Settings(**production_config(**overrides))


def test_production_config_accepts_secure_url_based_settings():
    settings = Settings(**production_config())

    assert settings.ENVIRONMENT == "production"
    assert settings.DATABASE_URL.startswith("postgresql://")
    assert settings.REDIS_URL.startswith("rediss://")
    assert settings.RABBITMQ_URL.startswith("amqps://")
    assert settings.AI_AGENT_ENABLED is True
    assert settings.AI_MODERATION_STRICT_MODE is True
    assert settings.GEMINI_STRONG_MODEL == "gemini-1.5-pro"
    assert settings.GEMINI_FAST_MODEL == "gemini-1.5-flash"
    assert settings.GEMINI_MODERATION_MODEL == "gemini-1.5-pro"
    assert settings.AI_MODERATION_REJECT_THRESHOLD >= (
        settings.AI_MODERATION_APPROVE_THRESHOLD
    )


def test_production_config_accepts_secure_component_settings():
    settings = Settings(
        **production_config(
            DATABASE_URL=None,
            POSTGRES_SERVER="db.prod.example.com",
            POSTGRES_PASSWORD="strong-db-password",
            REDIS_URL=None,
            REDIS_HOST="redis.prod.example.com",
            REDIS_PASSWORD="strong-redis-password",
            RABBITMQ_URL=None,
            RABBITMQ_HOST="mq.prod.example.com",
            RABBITMQ_USER="prod_mq",
            RABBITMQ_PASSWORD="strong-mq-password",
        )
    )

    assert settings.POSTGRES_SERVER == "db.prod.example.com"
    assert settings.REDIS_PASSWORD == "strong-redis-password"
    assert settings.RABBITMQ_USER == "prod_mq"


def test_production_config_accepts_payos_settings():
    settings = Settings(
        **production_config(
            PAYMENT_PROVIDER="payos",
            PAYOS_CLIENT_ID="payos-client",
            PAYOS_API_KEY="payos-api-key",
            PAYOS_CHECKSUM_KEY="payos-checksum-key",
            PAYOS_RETURN_URL="https://yag.example.com/payment/result",
        )
    )

    assert settings.PAYMENT_PROVIDER == "payos"
    assert settings.PAYOS_RETURN_URL.startswith("https://")


def test_production_config_accepts_pubsub_queue_settings():
    settings = Settings(
        **production_config(
            QUEUE_PROVIDER="pubsub",
            RABBITMQ_URL=None,
            GCP_PROJECT_ID="yag-prod-project",
            PUBSUB_MODERATION_TOPIC="yag-async-tasks",
            INTERNAL_TASK_TOKEN="prod_internal_task_token_at_least_32_chars",
        )
    )

    assert settings.QUEUE_PROVIDER == "pubsub"
    assert settings.GCP_PROJECT_ID == "yag-prod-project"


def test_production_config_accepts_pubsub_oidc_settings():
    settings = Settings(
        **production_config(
            QUEUE_PROVIDER="pubsub",
            RABBITMQ_URL=None,
            GCP_PROJECT_ID="yag-prod-project",
            PUBSUB_MODERATION_TOPIC="yag-async-tasks",
            INTERNAL_SERVICE_ACCOUNT_EMAIL="yag-backend@yag-prod-project.iam.gserviceaccount.com",
        )
    )

    assert settings.QUEUE_PROVIDER == "pubsub"
    assert settings.INTERNAL_SERVICE_ACCOUNT_EMAIL.endswith(".gserviceaccount.com")


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"ENVIRONMENT": "qa"}, "Invalid ENVIRONMENT"),
        ({"SERVICE_ROLE": "cron"}, "Invalid SERVICE_ROLE"),
        ({"QUEUE_PROVIDER": "local"}, "Invalid QUEUE_PROVIDER"),
        ({"AI_MAX_CONTEXT_CHARS": 999}, "AI_MAX_CONTEXT_CHARS"),
        ({"AI_RECOMMENDATION_CANDIDATE_LIMIT": 4}, "AI_RECOMMENDATION"),
        ({"AI_MODERATION_APPROVE_THRESHOLD": 1.2}, "AI_MODERATION"),
        (
            {
                "AI_MODERATION_APPROVE_THRESHOLD": 0.9,
                "AI_MODERATION_REJECT_THRESHOLD": 0.8,
            },
            "AI_MODERATION_REJECT_THRESHOLD",
        ),
        ({"SECRET_KEY": "dev_secret_key"}, "SECRET_KEY"),
        ({"GEMINI_API_KEY": ""}, "GEMINI_API_KEY"),
        ({"GEMINI_API_KEY": "your_gemini_api_key_here"}, "GEMINI_API_KEY"),
        ({"GEMINI_STRONG_MODEL": ""}, "GEMINI_STRONG_MODEL"),
        ({"GEMINI_FAST_MODEL": ""}, "GEMINI_FAST_MODEL"),
        ({"GEMINI_MODERATION_MODEL": ""}, "GEMINI_MODERATION_MODEL"),
        ({"CLOUDINARY_API_SECRET": ""}, "CLOUDINARY_API_SECRET"),
        ({"PAYOS_MOCK_ENABLED": True}, "PAYOS_MOCK_ENABLED"),
        ({"SMTP_HOST": ""}, "SMTP_HOST"),
        ({"ALLOW_WEBSOCKET_QUERY_TOKEN": True}, "ALLOW_WEBSOCKET_QUERY_TOKEN"),
        ({"AUTO_CREATE_TABLES": True}, "Database schema mutation"),
        ({"APPLY_MIGRATIONS_ON_STARTUP": True}, "Database schema mutation"),
        ({"SCHEDULER_ENABLED": True}, "SCHEDULER_ENABLED"),
        (
            {"DATABASE_URL": "postgresql://user:pass@localhost:5432/yag"},
            "DATABASE_URL",
        ),
        (
            {
                "DATABASE_URL": None,
                "POSTGRES_SERVER": "localhost",
                "POSTGRES_PASSWORD": "strong-db-password",
            },
            "POSTGRES_SERVER",
        ),
        (
            {
                "DATABASE_URL": None,
                "POSTGRES_SERVER": "db.prod.example.com",
                "POSTGRES_PASSWORD": "postgres",
            },
            "POSTGRES_PASSWORD",
        ),
        ({"REDIS_URL": "redis://localhost:6379/0"}, "REDIS_URL"),
        (
            {
                "REDIS_URL": None,
                "REDIS_HOST": "redis.prod.example.com",
                "REDIS_PASSWORD": "",
            },
            "REDIS_PASSWORD",
        ),
        (
            {"RABBITMQ_URL": "amqp://user:pass@localhost:5672/vhost"},
            "RABBITMQ_URL",
        ),
        (
            {
                "RABBITMQ_URL": None,
                "RABBITMQ_HOST": "localhost",
                "RABBITMQ_PASSWORD": "strong-mq-password",
            },
            "RABBITMQ_HOST",
        ),
        (
            {
                "RABBITMQ_URL": None,
                "RABBITMQ_HOST": "mq.prod.example.com",
                "RABBITMQ_USER": "guest",
                "RABBITMQ_PASSWORD": "guest",
            },
            "RabbitMQ credentials",
        ),
        (
            {
                "QUEUE_PROVIDER": "pubsub",
                "RABBITMQ_URL": None,
                "GCP_PROJECT_ID": "",
                "PUBSUB_MODERATION_TOPIC": "yag-async-tasks",
                "INTERNAL_TASK_TOKEN": "prod_internal_task_token_at_least_32_chars",
            },
            "PUBSUB_PROJECT_ID or GCP_PROJECT_ID",
        ),
        (
            {
                "QUEUE_PROVIDER": "pubsub",
                "RABBITMQ_URL": None,
                "GCP_PROJECT_ID": "yag-prod-project",
                "PUBSUB_MODERATION_TOPIC": "",
                "INTERNAL_TASK_TOKEN": "prod_internal_task_token_at_least_32_chars",
            },
            "PUBSUB_MODERATION_TOPIC",
        ),
        (
            {
                "QUEUE_PROVIDER": "pubsub",
                "RABBITMQ_URL": None,
                "GCP_PROJECT_ID": "yag-prod-project",
                "PUBSUB_MODERATION_TOPIC": "yag-async-tasks",
                "INTERNAL_TASK_TOKEN": "short",
            },
            "INTERNAL_TASK_TOKEN or INTERNAL_SERVICE_ACCOUNT_EMAIL",
        ),
        (
            {
                "QUEUE_PROVIDER": "pubsub",
                "RABBITMQ_URL": None,
                "GCP_PROJECT_ID": "yag-prod-project",
                "PUBSUB_MODERATION_TOPIC": "yag-async-tasks",
                "INTERNAL_SERVICE_ACCOUNT_EMAIL": "yag-backend@yag-prod-project.iam.gserviceaccount.com",
                "INTERNAL_AUTH_AUDIENCE": "http://localhost:8000/internal",
            },
            "INTERNAL_AUTH_AUDIENCE",
        ),
        ({"CORS_ORIGINS": "*"}, "CORS_ORIGINS"),
        ({"CORS_ORIGINS": "http://yag.example.com"}, "CORS_ORIGINS must be HTTPS"),
        (
            {
                "PAYMENT_PROVIDER": "payos",
                "PAYOS_CLIENT_ID": "payos-client",
                "PAYOS_API_KEY": "payos-api-key",
                "PAYOS_CHECKSUM_KEY": "payos-checksum-key",
                "PAYOS_RETURN_URL": "http://localhost:3000/payment/result",
            },
            "PAYOS_RETURN_URL",
        ),
    ],
)
def test_production_config_rejects_unsafe_settings(overrides, message):
    assert_config_rejected(overrides, message)
