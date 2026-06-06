import hashlib
import hmac
import json
import logging
from typing import Any, Dict, Optional, Tuple
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_payos_configured() -> bool:
    return bool(
        settings.PAYOS_CLIENT_ID
        and settings.PAYOS_API_KEY
        and settings.PAYOS_CHECKSUM_KEY
    )


def is_payos_mock_enabled() -> bool:
    return settings.ENVIRONMENT != "production" and settings.PAYOS_MOCK_ENABLED


def compute_payos_signature(data: Dict[str, Any], checksum_key: str) -> str:
    """
    Sort keys alphabetically, join into a query string, and compute HMAC-SHA256 signature.
    """
    sorted_keys = sorted(data.keys())
    parts = []
    for k in sorted_keys:
        v = data[k]
        if isinstance(v, list):
            # PayOS nested arrays are joined or ignored depending on API, but we usually serialize
            v = json.dumps(v, separators=(",", ":"), ensure_ascii=False)
        parts.append(f"{k}={v}")

    sign_content = "&".join(parts)
    return hmac.new(
        checksum_key.encode("utf-8"), sign_content.encode("utf-8"), hashlib.sha256
    ).hexdigest()


async def create_payos_payment_link(
    order_code: int,
    amount: int,
    description: str,
    return_url: str,
    cancel_url: str,
) -> Tuple[str, str]:
    """
    Create a payment link using PayOS API.
    Returns: Tuple of (payment_url, signature)
    """
    if not is_payos_configured():
        if is_payos_mock_enabled():
            logger.info("PayOS is not configured. Returning mock payment URL.")
            mock_url = f"{settings.PAYOS_RETURN_URL or return_url}?status=success&orderCode={order_code}&amount={amount}&txnRef=MOCK_PAYOS_{order_code}"
            return mock_url, "mock_signature"
        raise RuntimeError("PayOS is not configured.")

    pay_data = {
        "orderCode": order_code,
        "amount": amount,
        "description": description[:25],  # PayOS description is max 25 chars
        "cancelUrl": cancel_url,
        "returnUrl": return_url or settings.PAYOS_RETURN_URL,
    }

    # Generate signature for the request body
    signature = compute_payos_signature(pay_data, settings.PAYOS_CHECKSUM_KEY)
    pay_data["signature"] = signature

    headers = {
        "x-client-id": settings.PAYOS_CLIENT_ID,
        "x-api-key": settings.PAYOS_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.post(
                "https://api-merchant.payos.vn/v2/payment-requests",
                json=pay_data,
                headers=headers,
            )
            res_json = response.json()
            if response.status_code == 200 and res_json.get("code") == "00":
                checkout_url = res_json["data"]["checkoutUrl"]
                return checkout_url, signature
            else:
                logger.error("PayOS API error: %s", res_json)
                raise RuntimeError(res_json.get("desc", "Failed to create PayOS link"))
        except Exception as exc:
            logger.error(
                "Failed to connect to PayOS API: %s.", exc
            )
            if is_payos_mock_enabled():
                mock_url = f"{return_url}?status=success&orderCode={order_code}&amount={amount}&txnRef=MOCK_PAYOS_{order_code}"
                return mock_url, "mock_signature"
            raise


def verify_payos_webhook_signature(payload: Dict[str, Any]) -> bool:
    """
    Verify the signature sent in PayOS webhook request.
    """
    if not is_payos_configured():
        return is_payos_mock_enabled()

    received_signature = payload.get("signature", "")
    data = payload.get("data", {})
    if not received_signature or not data:
        return False

    computed_signature = compute_payos_signature(data, settings.PAYOS_CHECKSUM_KEY)
    return hmac.compare_digest(computed_signature.lower(), received_signature.lower())


async def get_payos_payment_info(order_code: int) -> Optional[Dict[str, Any]]:
    """
    Fetch payment link information from PayOS API.
    """
    if not is_payos_configured():
        return None

    headers = {
        "x-client-id": settings.PAYOS_CLIENT_ID,
        "x-api-key": settings.PAYOS_API_KEY,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"https://api-merchant.payos.vn/v2/payment-requests/{order_code}",
                headers=headers,
            )
            res_json = response.json()
            if response.status_code == 200 and res_json.get("code") == "00":
                return res_json.get("data")
            else:
                logger.error("PayOS Get Payment Info API error: %s", res_json)
                return None
        except Exception as exc:
            logger.error("Failed to connect to PayOS API: %s", exc)
            return None
