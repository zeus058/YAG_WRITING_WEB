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


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"ENVIRONMENT": "qa"}, "Invalid ENVIRONMENT"),
        ({"SERVICE_ROLE": "cron"}, "Invalid SERVICE_ROLE"),
        ({"SECRET_KEY": "dev_secret_key"}, "SECRET_KEY"),
        ({"GEMINI_API_KEY": ""}, "GEMINI_API_KEY"),
        ({"CLOUDINARY_API_SECRET": ""}, "CLOUDINARY_API_SECRET"),
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
