"""
Payment Service — VNPAY URL generation, checksum verification, and IPN processing.

Use Case: U012 (Thanh toán VNPAY).
Security: HMAC-SHA512 checksum for all VNPAY interactions.
"""
import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.membership_plan import MembershipPlan
from app.models.transaction import Transaction
from app.models.user import User


# ---------------------------------------------------------------------------
# VNPAY URL generation
# ---------------------------------------------------------------------------

def generate_vnpay_url(
    vnp_txn_ref: str,
    amount: float,
    ip_addr: str,
    order_info: str,
    return_url: Optional[str] = None,
) -> str:
    """
    Build a signed VNPAY payment URL.

    Steps:
    1. Assemble standard VNPAY query parameters.
    2. Sort parameters alphabetically by key.
    3. Generate HMAC-SHA512 hash from the sorted query string.
    4. Append vnp_SecureHash to the URL.

    Args:
        vnp_txn_ref: Unique transaction reference (e.g. "YAG20260525123456").
        amount: Payment amount in VND (will be multiplied by 100 per VNPAY spec).
        ip_addr: Client IP address.
        order_info: Human-readable order description.
        return_url: Frontend URL to redirect after payment (overrides config default).

    Returns:
        Full VNPAY payment URL with secure hash appended.
    """
    vnp_params: Dict[str, str] = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": settings.VNP_TMN_CODE,
        "vnp_Amount": str(int(amount * 100)),  # VNPAY requires amount × 100
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": vnp_txn_ref,
        "vnp_OrderInfo": order_info,
        "vnp_OrderType": "billpayment",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": return_url or settings.VNP_RETURN_URL,
        "vnp_IpAddr": ip_addr,
        "vnp_CreateDate": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
    }

    # Sort alphabetically by key
    sorted_params = sorted(vnp_params.items())
    query_string = urlencode(sorted_params)

    # HMAC-SHA512 hash
    secure_hash = hmac.new(
        settings.VNP_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    payment_url = f"{settings.VNP_URL}?{query_string}&vnp_SecureHashType=SHA512&vnp_SecureHash={secure_hash}"
    return payment_url


# ---------------------------------------------------------------------------
# VNPAY checksum verification
# ---------------------------------------------------------------------------

def verify_vnpay_checksum(query_params: Dict[str, Any]) -> bool:
    """
    Verify the HMAC-SHA512 secure hash sent by VNPAY in an IPN callback.

    Args:
        query_params: Dict of all query parameters received from VNPAY.

    Returns:
        True if the checksum is valid, False otherwise.
    """
    received_hash = query_params.get("vnp_SecureHash", "")

    # Remove hash-related fields before re-signing
    params_to_sign = {
        k: v for k, v in query_params.items()
        if k not in ("vnp_SecureHash", "vnp_SecureHashType")
    }

    sorted_params = sorted(params_to_sign.items())
    query_string = urlencode(sorted_params)

    computed_hash = hmac.new(
        settings.VNP_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    return hmac.compare_digest(computed_hash.lower(), received_hash.lower())


# ---------------------------------------------------------------------------
# IPN processing (full business logic)
# ---------------------------------------------------------------------------

def process_ipn(
    db: Session,
    query_params: Dict[str, Any],
) -> Tuple[str, str]:
    """
    Process a VNPAY IPN callback.

    Business logic follows the VNPAY IPN spec and api-routes.md RspCode mapping:
    - "97": Invalid checksum.
    - "02": Transaction not found.
    - "04": Transaction already processed (not pending).
    - "00": Confirmed successfully.

    Args:
        db: Database session.
        query_params: All query parameters from the VNPAY IPN request.

    Returns:
        Tuple of (RspCode, Message).
    """
    # Step 1: Verify checksum
    if not verify_vnpay_checksum(query_params):
        return ("97", "Invalid Checksum")

    # Step 2: Find transaction by vnp_TxnRef
    vnp_txn_ref = query_params.get("vnp_TxnRef", "")
    transaction = (
        db.query(Transaction)
        .filter(Transaction.vnp_txn_ref == vnp_txn_ref)
        .first()
    )
    if transaction is None:
        return ("02", "Transaction not found")

    # Step 3: Check if already processed
    if transaction.status != "pending":
        return ("04", "Transaction already processed")

    # Step 4: Validate amount matches (VNPAY sends amount × 100)
    vnp_amount = int(query_params.get("vnp_Amount", "0"))
    expected_amount = int(float(transaction.amount) * 100)
    if vnp_amount != expected_amount:
        return ("04", "Amount mismatch")

    # Step 5: Check VNPAY response code
    vnp_response_code = query_params.get("vnp_ResponseCode", "")
    vnp_transaction_no = query_params.get("vnp_TransactionNo", "")

    if vnp_response_code == "00":
        # Payment successful
        transaction.status = "success"
        transaction.vnp_transaction_no = vnp_transaction_no

        # Extend user's premium subscription
        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            plan = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.id == transaction.plan_id)
                .first()
            )
            if plan:
                now = datetime.now(timezone.utc)
                # If user already has active premium, extend from current expiry
                if user.premium_until and user.premium_until > now:
                    user.premium_until = user.premium_until + timedelta(days=plan.duration_days)
                else:
                    user.premium_until = now + timedelta(days=plan.duration_days)
    else:
        # Payment failed
        transaction.status = "failed"

    db.commit()
    return ("00", "Confirm Success")


# ---------------------------------------------------------------------------
# Transaction helpers
# ---------------------------------------------------------------------------

def generate_txn_ref() -> str:
    """Generate a unique VNPAY transaction reference: YAG + timestamp + short UUID."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    short_id = uuid.uuid4().hex[:6].upper()
    return f"YAG{timestamp}{short_id}"
