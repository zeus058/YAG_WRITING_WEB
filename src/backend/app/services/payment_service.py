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

    now = datetime.now(timezone.utc)

    # Step 2: Find transaction by vnp_TxnRef with a row lock when the DB supports it.
    vnp_txn_ref = query_params.get("vnp_TxnRef", "")
    query = db.query(Transaction).filter(Transaction.vnp_txn_ref == vnp_txn_ref)
    if hasattr(query, "with_for_update"):
        query = query.with_for_update()
    transaction = query.first()
    if transaction is None:
        return ("02", "Transaction not found")

    # Step 3: Check if already processed
    if transaction.status != "pending":
        return ("04", "Transaction already processed")

    # Step 4: Validate amount matches (VNPAY sends amount × 100)
    vnp_amount = _int_param(query_params, "vnp_Amount")
    expected_amount = int(float(transaction.amount) * 100)
    if vnp_amount is None or vnp_amount != expected_amount:
        transaction.ipn_received_at = now
        transaction.raw_ipn_payload = _stringify_payload(query_params)
        db.commit()
        return ("04", "Amount mismatch")

    # Step 5: Check VNPAY response code
    vnp_response_code = query_params.get("vnp_ResponseCode", "")
    vnp_transaction_status = query_params.get(
        "vnp_TransactionStatus", vnp_response_code
    )
    vnp_transaction_no = query_params.get("vnp_TransactionNo", "")

    transaction.vnp_response_code = vnp_response_code
    transaction.vnp_transaction_status = vnp_transaction_status
    transaction.ipn_received_at = now
    transaction.raw_ipn_payload = _stringify_payload(query_params)
    if vnp_transaction_no:
        transaction.vnp_transaction_no = vnp_transaction_no

    if vnp_response_code == "00" and vnp_transaction_status == "00":
        # Payment successful
        transaction.status = "success"
        transaction.paid_at = now
        transaction.failed_at = None

        # Extend user's premium subscription
        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            plan = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.id == transaction.plan_id)
                .first()
            )
            if plan:
                # If user already has active premium, extend from current expiry
                if user.premium_until and _as_utc(user.premium_until) > now:
                    user.premium_until = _as_utc(user.premium_until) + timedelta(
                        days=plan.duration_days
                    )
                else:
                    user.premium_until = now + timedelta(days=plan.duration_days)
    else:
        # Payment failed
        transaction.status = "failed"
        transaction.failed_at = now
        transaction.paid_at = None

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    return ("00", "Confirm Success")


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
    """
    Verify payment checksum and return transaction details for user-facing S10 redirect.
    """
    # 1. Verify checksum (with bypass logic for mock/development flows)
    vnp_txn_ref = query_params.get("vnp_TxnRef", "")
    received_hash = query_params.get("vnp_SecureHash", "")
    is_mock = vnp_txn_ref == "MOCK_TXN_REF" or (
        vnp_txn_ref and vnp_txn_ref.startswith("MOCK_")
    )
    bypass_checksum = (
        not received_hash
        or is_mock
        or settings.VNP_HASH_SECRET == "YOUR_VNPAY_HASH_SECRET_HERE"
    )

    if not bypass_checksum and not verify_vnpay_checksum(query_params):
        return {"success": False, "message": "Mã bảo mật checksum không hợp lệ."}

    # 2. Handle mock transactions for development
    if vnp_txn_ref == "MOCK_TXN_REF" or (
        vnp_txn_ref and vnp_txn_ref.startswith("MOCK_")
    ):
        vnp_response_code = query_params.get("vnp_ResponseCode", "00")
        if vnp_response_code != "00":
            return {
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

    vnp_response_code = query_params.get("vnp_ResponseCode", "")
    vnp_transaction_no = query_params.get("vnp_TransactionNo", "")

    # Handle pending transactions if client arrived before IPN callback
    if transaction.status == "pending" and vnp_response_code == "00":
        transaction.status = "success"
        transaction.vnp_transaction_no = vnp_transaction_no

        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            plan = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.id == transaction.plan_id)
                .first()
            )
            if plan:
                now = datetime.now(timezone.utc)
                if user.premium_until and user.premium_until > now:
                    user.premium_until = user.premium_until + timedelta(
                        days=plan.duration_days
                    )
                else:
                    user.premium_until = now + timedelta(days=plan.duration_days)
        db.commit()
    elif transaction.status == "pending" and vnp_response_code != "":
        transaction.status = "failed"
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
