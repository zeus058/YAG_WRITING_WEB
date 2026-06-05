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

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.membership_plan import MembershipPlan
from app.models.transaction import Transaction
from app.models.user import User


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _int_param(query_params: Dict[str, Any], key: str) -> int | None:
    try:
        return int(str(query_params.get(key, "")))
    except (TypeError, ValueError):
        return None


def _stringify_payload(query_params: Dict[str, Any]) -> dict[str, str]:
    return {key: str(value) for key, value in query_params.items()}


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
"""
Payment Service — VNPAY URL generation, checksum verification, and IPN processing.

Use Case: U012 (Thanh toán VNPAY).
Security: HMAC-SHA512 checksum for all VNPAY interactions.
"""

import hashlib
import hmac
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from urllib.parse import urlencode

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.membership_plan import MembershipPlan
from app.models.transaction import Transaction
from app.models.user import User
from app.services import payos_service


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _int_param(query_params: Dict[str, Any], key: str) -> int | None:
    try:
        return int(str(query_params.get(key, "")))
    except (TypeError, ValueError):
        return None


def _stringify_payload(query_params: Dict[str, Any]) -> dict[str, str]:
    return {key: str(value) for key, value in query_params.items()}


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


def generate_payos_url(
    txn_ref: str,
    amount: float,
    ip_addr: str,
    order_info: str,
    return_url: Optional[str] = None,
) -> str:
    """Generate a signed PAYOS payment URL using the payos_service."""
    return payos_service.generate_payment_url(txn_ref, amount, order_info, return_url)


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
        k: v
        for k, v in query_params.items()
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


def verify_payos_signature(query_params: Dict[str, Any]) -> bool:
    """Verify PAYOS callback signature using payos_service."""
    return payos_service.verify_signature(query_params)

# ---------------------------------------------------------------------------

def generate_payment_url(
    vnp_txn_ref: str,
    amount: float,
    ip_addr: str,
    order_info: str,
    return_url: Optional[str] = None,
) -> Tuple[str, str]:
    """Generate payment URL based on PAYMENT_PROVIDER.
    Returns (url, transaction_reference).
    """
    if settings.PAYMENT_PROVIDER == "payos":
        # PayOS expects integer amount and order code as int
        order_code = int(vnp_txn_ref)
        cancel_url = (return_url or settings.PAYOS_RETURN_URL or "").split("?")[0] + "?status=cancel"
        payment_url, _ = payos_service.create_payos_payment_link(
            order_code=order_code,
            amount=int(amount),
            description=order_info,
            return_url=return_url or settings.PAYOS_RETURN_URL,
            cancel_url=cancel_url,
        )
        return payment_url, str(order_code)
    else:
        # Default to VNPAY
        payment_url = generate_vnpay_url(
            vnp_txn_ref=vnp_txn_ref,
            amount=amount,
            ip_addr=ip_addr,
            order_info=order_info,
            return_url=return_url,
        )
        return payment_url, vnp_txn_ref
# ---------------------------------------------------------------------------
# IPN processing (full business logic)
# ---------------------------------------------------------------------------


def process_ipn(
    db: Session,
    query_params: Dict[str, Any],
) -> Tuple[str, str]:
    """Process PAYOS IPN callback.
    Placeholder implementation – replace with actual PAYOS IPN handling.
    """
    # TODO: Implement IPN processing for PAYOS
    raise NotImplementedError("PAYOS IPN processing not implemented")


# ---------------------------------------------------------------------------
# Transaction helpers
# ---------------------------------------------------------------------------


def generate_txn_ref() -> str:
    """Generate a unique VNPAY transaction reference: YAG + timestamp + short UUID."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    short_id = uuid.uuid4().hex[:6].upper()
    return f"YAG{timestamp}{short_id}"


def verify_payment_result(
    db: Session,
    query_params: Dict[str, Any],
    current_user: Optional[User] = None,
) -> Dict[str, Any]:
                "success": False,
                "message": f"Mô phỏng thanh toán thất bại (vnp_ResponseCode={vnp_response_code})",
            }
        now = datetime.now(timezone.utc)
        vnp_amount_str = query_params.get("vnp_Amount", "4900000")
        try:
            raw_amount = float(vnp_amount_str)
            amount = raw_amount / 100 if raw_amount >= 1000000 else raw_amount
        except ValueError:
            amount = 49000.0

        # Query database to find a matching plan by price (only if db supports queries)
        plan = None
        if hasattr(db, "query"):
            plan = (
                db.query(MembershipPlan).filter(MembershipPlan.price == amount).first()
            )

        if plan:
            duration_days = plan.duration_days
            plan_name = plan.name
        else:
            duration_days = 365 if amount > 100000 else 30
            plan_name = (
                "Gói Năm Premium" if duration_days == 365 else "Gói Tháng Premium"
            )

        premium_until = now + timedelta(days=duration_days)

        if current_user:
            if current_user.premium_until and current_user.premium_until > now:
                current_user.premium_until = current_user.premium_until + timedelta(
                    days=duration_days
                )
            else:
                current_user.premium_until = now + timedelta(days=duration_days)
            premium_until = current_user.premium_until
            db.commit()

        return {
            "success": True,
            "transaction_id": uuid.UUID("00000000-0000-0000-0000-000000000000"),
            "plan_name": plan_name,
            "amount": amount,
            "premium_until": premium_until,
            "message": "Thanh toán thành công (Mô phỏng)",
        }

    # 3. Find real transaction
    transaction = (
        db.query(Transaction).filter(Transaction.vnp_txn_ref == vnp_txn_ref).first()
    )
    if transaction is None:
        return {"success": False, "message": "Không tìm thấy giao dịch tương ứng."}

    if current_user and str(transaction.user_id) != str(current_user.id):
        return {"success": False, "message": "Giao dịch không thuộc tài khoản hiện tại."}

    vnp_response_code = query_params.get("vnp_ResponseCode", "")
    vnp_transaction_status = query_params.get(
        "vnp_TransactionStatus", vnp_response_code
    )
    vnp_transaction_no = query_params.get("vnp_TransactionNo", "")

    vnp_amount = _int_param(query_params, "vnp_Amount")
    expected_amount = int(float(transaction.amount) * 100)
    if vnp_amount is not None and vnp_amount != expected_amount:
        return {"success": False, "message": "Số tiền giao dịch không khớp."}

    # Handle pending transactions if client arrived before IPN callback
    if (
        transaction.status == "pending"
        and vnp_response_code == "00"
        and vnp_transaction_status == "00"
    ):
        transaction.status = "success"
        transaction.vnp_transaction_no = vnp_transaction_no
        transaction.vnp_response_code = vnp_response_code
        transaction.vnp_transaction_status = vnp_transaction_status
        transaction.paid_at = datetime.now(timezone.utc)

        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            plan = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.id == transaction.plan_id)
                .first()
            )
            if plan:
                now = datetime.now(timezone.utc)
                if user.premium_until and _as_utc(user.premium_until) > now:
                    user.premium_until = _as_utc(user.premium_until) + timedelta(
                        days=plan.duration_days
                    )
                else:
                    user.premium_until = now + timedelta(days=plan.duration_days)
        db.commit()
    elif transaction.status == "pending" and vnp_response_code != "":
        transaction.status = "failed"
        transaction.vnp_response_code = vnp_response_code
        transaction.vnp_transaction_status = vnp_transaction_status
        transaction.failed_at = datetime.now(timezone.utc)
        db.commit()

    plan = (
        db.query(MembershipPlan)
        .filter(MembershipPlan.id == transaction.plan_id)
        .first()
    )
    plan_name = plan.name if plan else "Gói Membership"
    user = db.query(User).filter(User.id == transaction.user_id).first()
    premium_until = user.premium_until if user else None

    return {
        "success": transaction.status == "success",
        "transaction_id": transaction.id,
        "plan_name": plan_name,
        "amount": float(transaction.amount),
        "premium_until": premium_until,
        "message": (
            "Thanh toán thành công"
            if transaction.status == "success"
            else "Thanh toán thất bại"
        ),
    }
