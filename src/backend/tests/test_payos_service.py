import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
import httpx

from app.services.payos_service import (
    is_payos_configured,
    compute_payos_signature,
    create_payos_payment_link,
    verify_payos_webhook_signature,
)


def test_is_payos_configured():
    with patch("app.services.payos_service.settings") as mock_settings:
        mock_settings.PAYOS_CLIENT_ID = "id"
        mock_settings.PAYOS_API_KEY = "key"
        mock_settings.PAYOS_CHECKSUM_KEY = "checksum"
        assert is_payos_configured() is True

        mock_settings.PAYOS_CLIENT_ID = None
        assert is_payos_configured() is False


def test_compute_payos_signature():
    data = {
        "b": "value_b",
        "a": "value_a",
        "items": [{"name": "item1", "price": 100}],
    }
    # verify it runs without crashing and sorts keys
    sig = compute_payos_signature(data, "mykey")
    assert isinstance(sig, str)
    assert len(sig) == 64  # SHA256 hex digest length


def test_create_payos_payment_link_not_configured():
    with patch("app.services.payos_service.is_payos_configured", return_value=False), \
         patch("app.services.payos_service.is_payos_mock_enabled", return_value=False):
        with pytest.raises(RuntimeError, match="PayOS is not configured"):
            asyncio.run(
                create_payos_payment_link(
                    1234,
                    50000,
                    "description",
                    "http://return.url",
                    "http://cancel.url",
                )
            )


def test_create_payos_payment_link_not_configured_with_mock_enabled():
    with patch("app.services.payos_service.is_payos_configured", return_value=False), \
        patch("app.services.payos_service.is_payos_mock_enabled", return_value=True):
        url, sig = asyncio.run(
            create_payos_payment_link(
                1234,
                50000,
                "description",
                "http://return.url",
                "http://cancel.url",
            )
        )
        assert "MOCK_PAYOS_1234" in url
        assert sig == "mock_signature"


def test_create_payos_payment_link_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "code": "00",
        "data": {
            "checkoutUrl": "https://payos.vn/checkout/xyz"
        }
    }

    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    # Mock AsyncClient constructor to return our mock client context manager
    mock_async_client_class = MagicMock()
    mock_async_client_class.return_value.__aenter__.return_value = mock_client

    with patch("app.services.payos_service.is_payos_configured", return_value=True), \
         patch("app.services.payos_service.settings") as mock_settings, \
         patch("app.services.payos_service.httpx.AsyncClient", mock_async_client_class):

        mock_settings.PAYOS_CLIENT_ID = "id"
        mock_settings.PAYOS_API_KEY = "key"
        mock_settings.PAYOS_CHECKSUM_KEY = "checksum"
        mock_settings.PAYOS_RETURN_URL = "http://global-return.url"

        url, sig = asyncio.run(
            create_payos_payment_link(
                5678,
                100000,
                "Order 5678 description longer than 25 chars",
                "http://return.url",
                "http://cancel.url",
            )
        )
        assert url == "https://payos.vn/checkout/xyz"
        assert len(sig) == 64


def test_create_payos_payment_link_api_error_fallback():
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {
        "code": "error_code",
        "desc": "Bad request parameters"
    }

    mock_client = MagicMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_async_client_class = MagicMock()
    mock_async_client_class.return_value.__aenter__.return_value = mock_client

    with patch("app.services.payos_service.is_payos_configured", return_value=True), \
         patch("app.services.payos_service.settings") as mock_settings, \
         patch("app.services.payos_service.httpx.AsyncClient", mock_async_client_class):

        mock_settings.PAYOS_CLIENT_ID = "id"
        mock_settings.PAYOS_API_KEY = "key"
        mock_settings.PAYOS_CHECKSUM_KEY = "checksum"
        mock_settings.PAYOS_RETURN_URL = "http://global-return.url"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.PAYOS_MOCK_ENABLED = True

        # Should log and fall back to mock
        url, sig = asyncio.run(
            create_payos_payment_link(
                1234,
                50000,
                "desc",
                "http://return.url",
                "http://cancel.url",
            )
        )
        assert "MOCK_PAYOS_1234" in url
        assert sig == "mock_signature"


def test_create_payos_payment_link_exception_fallback():
    mock_client = MagicMock()
    mock_client.post = AsyncMock(side_effect=httpx.ConnectError("Network is down"))
    mock_async_client_class = MagicMock()
    mock_async_client_class.return_value.__aenter__.return_value = mock_client

    with patch("app.services.payos_service.is_payos_configured", return_value=True), \
         patch("app.services.payos_service.settings") as mock_settings, \
         patch("app.services.payos_service.httpx.AsyncClient", mock_async_client_class):

        mock_settings.PAYOS_CLIENT_ID = "id"
        mock_settings.PAYOS_API_KEY = "key"
        mock_settings.PAYOS_CHECKSUM_KEY = "checksum"
        mock_settings.PAYOS_RETURN_URL = "http://global-return.url"
        mock_settings.ENVIRONMENT = "development"
        mock_settings.PAYOS_MOCK_ENABLED = True

        # Should catch Exception and fall back to mock
        url, sig = asyncio.run(
            create_payos_payment_link(
                1234,
                50000,
                "desc",
                "http://return.url",
                "http://cancel.url",
            )
        )
        assert "MOCK_PAYOS_1234" in url
        assert sig == "mock_signature"


def test_verify_payos_webhook_signature():
    # 1. Not configured -> follows explicit dev mock flag
    with patch("app.services.payos_service.is_payos_configured", return_value=False), \
         patch("app.services.payos_service.is_payos_mock_enabled", return_value=False):
        assert verify_payos_webhook_signature({"signature": "sig"}) is False

    with patch("app.services.payos_service.is_payos_configured", return_value=False), \
         patch("app.services.payos_service.is_payos_mock_enabled", return_value=True):
        assert verify_payos_webhook_signature({"signature": "sig"}) is True

    # 2. Configured, missing signature or data -> returns False
    with patch("app.services.payos_service.is_payos_configured", return_value=True):
        assert verify_payos_webhook_signature({}) is False
        assert verify_payos_webhook_signature({"signature": "sig"}) is False
        assert verify_payos_webhook_signature({"data": {}}) is False

    # 3. Configured, valid signature -> returns True
    with patch("app.services.payos_service.is_payos_configured", return_value=True), \
         patch("app.services.payos_service.settings") as mock_settings:
        mock_settings.PAYOS_CHECKSUM_KEY = "key"

        payload_data = {"orderCode": 123, "amount": 1000}
        valid_sig = compute_payos_signature(payload_data, "key")

        payload = {
            "signature": valid_sig,
            "data": payload_data,
        }
        assert verify_payos_webhook_signature(payload) is True

    # 4. Configured, invalid signature -> returns False
    with patch("app.services.payos_service.is_payos_configured", return_value=True), \
         patch("app.services.payos_service.settings") as mock_settings:
        mock_settings.PAYOS_CHECKSUM_KEY = "key"

        payload = {
            "signature": "invalid_sig",
            "data": {"orderCode": 123},
        }
        assert verify_payos_webhook_signature(payload) is False
