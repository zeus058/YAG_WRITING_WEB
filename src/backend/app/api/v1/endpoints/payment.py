"""
Membership Billing & PayOS Payment Routing Handler.
Assigned Member: Nguyễn Duy Trường (U011, U012 - TC-007 to TC-012).

Endpoints:
  GET  /plans              — List membership plans (public)
  GET  /membership/status  — Current user's membership status (auth required)
  POST /payos/checkout     — Create transaction + generate PayOS checkout URL (auth required)
  POST /payos/webhook      — PayOS webhook callback (public, signature verified)
  GET  /history            — User's transaction history (auth required)
"""

import uuid
from typing import List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.config import settings
from app.models.membership_plan import MembershipPlan
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.membership import (
    CheckoutRequest,
    CheckoutResponse,
    MembershipPlanResponse,
    MembershipStatusResponse,
)
from app.schemas.payment import (
    PaymentResultResponse,
    TransactionHistoryItem,
    TransactionStatusResponse,
)
from app.services import membership_service as membership_svc
from app.services import payos_service as payos_svc

router = APIRouter()
membership_router = APIRouter()


def _allowed_return_origins() -> set[str]:
    origins = set(settings.cors_origin_list)
    if settings.PAYOS_RETURN_URL:
        parsed = urlparse(settings.PAYOS_RETURN_URL)
        if parsed.scheme and parsed.netloc:
            origins.add(f"{parsed.scheme}://{parsed.netloc}")
    return origins


def _validate_return_url(return_url: str) -> None:
    parsed = urlparse(return_url)
    if not parsed.scheme or not parsed.netloc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_RETURN_URL",
        )

    if settings.ENVIRONMENT == "production":
        origin = f"{parsed.scheme}://{parsed.netloc}"
        if parsed.scheme != "https" or origin not in _allowed_return_origins():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="RETURN_URL_NOT_ALLOWED",
            )


# ---------------------------------------------------------------------------
# U011 — Membership Plans
# ---------------------------------------------------------------------------


@membership_router.get(
    "/plans",
    response_model=List[MembershipPlanResponse],
    summary="U011 - Danh mục các gói cước Premium",
)
@router.get(
    "/plans",
    response_model=List[MembershipPlanResponse],
    summary="U011 - Danh mục các gói cước Premium",
)
def get_plans(db: Session = Depends(deps.get_db)):
    """
    Trả về danh sách tất cả các gói Membership có sẵn.
    Endpoint công khai — không yêu cầu JWT.
    """
    plans = membership_svc.get_all_plans(db)
    return plans


@router.get(
    "/membership/status",
    response_model=MembershipStatusResponse,
    summary="U011 - Trạng thái Membership hiện tại",
)
def get_membership_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Trả về trạng thái Membership của user đang đăng nhập.
    Được sử dụng trên S13 (Cài đặt tài khoản) để hiển thị gói hiện tại.
    """
    is_active = membership_svc.is_premium_active(current_user)
    plan_name = None
    if is_active:
        # Get the latest successful transaction for this user to retrieve the active plan name
        last_txn = (
            db.query(Transaction)
            .filter(
                Transaction.user_id == current_user.id, Transaction.status == "success"
            )
            .order_by(Transaction.created_at.desc())
            .first()
        )
        if last_txn and last_txn.membership_plan:
            plan_name = last_txn.membership_plan.name
        else:
            plan_name = "Premium Member"

    return MembershipStatusResponse(
        plan_name=plan_name,
        premium_until=current_user.premium_until,
        is_active=is_active,
    )


# ---------------------------------------------------------------------------
# U012 — PayOS Payment
# ---------------------------------------------------------------------------


@router.post(
    "/payos/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo hóa đơn và sinh checkout URL PayOS",
)
@router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo hóa đơn và sinh checkout URL PayOS (General)",
)
@membership_router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo checkout Membership qua PayOS",
)
@membership_router.post(
    "/payos/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo checkout Membership qua PayOS (Explicit)",
)
async def checkout(
    body: CheckoutRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Tạo giao dịch mới (pending) và sinh URL thanh toán PayOS.
    Frontend sẽ redirect user sang PayOS để quét mã QR thanh toán.
    """
    if current_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản quản trị viên không thể thực hiện giao dịch thanh toán.",
        )
    # Validate plan exists
    plan = membership_svc.get_plan_by_id(db, body.plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gói cước '{body.plan_id}' không tồn tại.",
        )

    import time
    import random

    order_code = int(time.time() * 100) + random.randint(10, 99)

    transaction = Transaction(
        id=uuid.uuid4(),
        user_id=current_user.id,
        plan_id=plan.id,
        amount=float(plan.price),
        vnp_txn_ref=str(order_code),
        status="pending",
    )
    db.add(transaction)
    db.commit()

    order_info = f"YAG Premium {plan.id}"
    return_url = body.return_url or settings.PAYOS_RETURN_URL
    if not return_url:
        return_url = "http://localhost:3000/payment/result"
    _validate_return_url(return_url)
    cancel_url = return_url.split("?")[0] + "?status=cancel"
    try:
        payment_url, _ = await payos_svc.create_payos_payment_link(
            order_code=order_code,
            amount=int(plan.price),
            description=order_info,
            return_url=return_url,
            cancel_url=cancel_url,
        )
    except Exception as exc:
        transaction.status = "failed"
        db.add(transaction)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="PAYOS_CHECKOUT_FAILED",
        ) from exc

    return CheckoutResponse(
        payment_url=payment_url,
        vnp_txn_ref=str(order_code),
        paymentUrl=payment_url,
        transactionId=str(order_code),
    )


@router.post(
    "/payos/verify",
    response_model=PaymentResultResponse,
    summary="Xác thực kết quả thanh toán PayOS cho Frontend",
)
@router.post(
    "/verify",
    response_model=PaymentResultResponse,
    summary="Xác thực kết quả thanh toán cho Frontend",
)
async def verify_checkout(
    query_params: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Nhận tham số chuyển hướng từ PayOS, kiểm tra và trả về trạng thái chi tiết cho S10.
    """
    return await verify_payos_checkout(query_params, db, current_user)


@router.post(
    "/payos/webhook",
    summary="Webhook nhận callback từ PayOS",
)
async def payos_webhook(
    request: Request,
    db: Session = Depends(deps.get_db),
):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if not payos_svc.verify_payos_webhook_signature(payload):
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = payload.get("data", {})
    order_code = data.get("orderCode")
    if not order_code:
        return {"status": "ok", "message": "No orderCode in webhook data"}

    transaction = (
        db.query(Transaction).filter(Transaction.vnp_txn_ref == str(order_code)).first()
    )
    if not transaction:
        return {"status": "ok", "message": "Transaction not found"}

    if transaction.status != "pending":
        return {"status": "ok", "message": "Transaction already processed"}

    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    transaction.ipn_received_at = now
    transaction.raw_ipn_payload = {k: str(v) for k, v in payload.items()}

    if payload.get("code") == "00":
        transaction.status = "success"
        transaction.paid_at = now
        transaction.vnp_transaction_no = str(data.get("reference", ""))
        transaction.vnp_response_code = "00"
        transaction.vnp_transaction_status = "00"

        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user:
            plan = (
                db.query(MembershipPlan)
                .filter(MembershipPlan.id == transaction.plan_id)
                .first()
            )
            if plan:
                if (
                    user.premium_until
                    and user.premium_until.replace(tzinfo=timezone.utc) > now
                ):
                    user.premium_until = user.premium_until.replace(
                        tzinfo=timezone.utc
                    ) + timedelta(days=plan.duration_days)
                else:
                    user.premium_until = now + timedelta(days=plan.duration_days)
    else:
        transaction.status = "failed"
        transaction.failed_at = now

    db.commit()
    return {"status": "ok", "message": "Confirm Success"}


async def verify_payos_checkout(
    query_params: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    order_code = (
        query_params.get("orderCode")
        or query_params.get("vnp_TxnRef")
        or query_params.get("transactionId")
        or query_params.get("txnRef")
    )
    status_param = (
        query_params.get("status")
        or query_params.get("code")
        or query_params.get("vnp_ResponseCode")
    )

    if not order_code:
        return {
            "success": False,
            "message": "Không tìm thấy mã hóa đơn đối soát PayOS.",
        }

    transaction = (
        db.query(Transaction).filter(Transaction.vnp_txn_ref == str(order_code)).first()
    )
    if not transaction:
        return {"success": False, "message": "Giao dịch không tồn tại trên hệ thống."}
    if str(transaction.user_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    plan = (
        db.query(MembershipPlan)
        .filter(MembershipPlan.id == transaction.plan_id)
        .first()
    )
    plan_name = plan.name if plan else "Gói Membership"

    is_success = False

    # Check mock status first if enabled
    if settings.PAYOS_MOCK_ENABLED and (status_param == "success" or status_param == "PAID"):
        is_success = True
    elif payos_svc.is_payos_configured():
        # Verify PAID status directly from PayOS API
        try:
            order_code_int = int(order_code)
            payos_info = await payos_svc.get_payos_payment_info(order_code_int)
        except (ValueError, TypeError):
            payos_info = None

        if payos_info and payos_info.get("status") == "PAID":
            is_success = True
            transaction.vnp_transaction_no = str(payos_info.get("reference", ""))
            transaction.vnp_response_code = "00"
            transaction.vnp_transaction_status = "00"
        elif payos_info and payos_info.get("status") in ("CANCELLED", "FAILED"):
            transaction.status = "failed"
            db.commit()
            return {"success": False, "message": "Giao dịch thanh toán đã bị hủy hoặc thất bại."}
    else:
        # PayOS is not configured, and not a mock success
        if not settings.PAYOS_MOCK_ENABLED and settings.ENVIRONMENT == "production":
            return {"success": False, "message": "PayOS is not configured."}
        
        is_success = (transaction.status == "success")
        if not is_success and status_param == "cancel":
            transaction.status = "failed"
            db.commit()
            return {"success": False, "message": "Người dùng đã hủy thanh toán giao dịch."}

    if is_success and transaction.status == "pending":
        from datetime import datetime, timezone, timedelta

        now = datetime.now(timezone.utc)
        transaction.status = "success"
        transaction.paid_at = now
        user = db.query(User).filter(User.id == transaction.user_id).first()
        if user and plan:
            if (
                user.premium_until
                and user.premium_until.replace(tzinfo=timezone.utc) > now
            ):
                user.premium_until = user.premium_until.replace(
                    tzinfo=timezone.utc
                ) + timedelta(days=plan.duration_days)
            else:
                user.premium_until = now + timedelta(days=plan.duration_days)
        db.commit()

    user = db.query(User).filter(User.id == transaction.user_id).first()
    premium_until = user.premium_until if user else None

    return {
        "success": transaction.status == "success",
        "transaction_id": transaction.id,
        "plan_name": plan_name,
        "amount": float(transaction.amount),
        "premium_until": premium_until,
        "message": (
            "Thanh toán thành công qua PayOS"
            if transaction.status == "success"
            else "Giao dịch chưa hoàn tất hoặc thất bại."
        ),
    }


@router.get(
    "/transactions/{vnp_txn_ref}",
    response_model=TransactionStatusResponse,
    summary="U012 - Tra cứu trạng thái giao dịch theo mã PayOS reference",
)
def get_transaction_status(
    vnp_txn_ref: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Frontend payment-result uses this endpoint to confirm backend/IPN state
    instead of trusting browser redirect query params.
    """
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.vnp_txn_ref == vnp_txn_ref,
            Transaction.user_id == current_user.id,
        )
        .options(joinedload(Transaction.membership_plan))
        .first()
    )
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    return TransactionStatusResponse(
        id=transaction.id,
        vnp_txn_ref=transaction.vnp_txn_ref,
        plan_id=transaction.plan_id,
        plan_name=(
            transaction.membership_plan.name if transaction.membership_plan else None
        ),
        amount=float(transaction.amount),
        status=transaction.status,
        vnp_transaction_no=transaction.vnp_transaction_no,
        vnp_response_code=transaction.vnp_response_code,
        vnp_transaction_status=transaction.vnp_transaction_status,
        paid_at=transaction.paid_at,
        failed_at=transaction.failed_at,
        ipn_received_at=transaction.ipn_received_at,
        created_at=transaction.created_at,
    )


@router.get(
    "/history",
    response_model=List[TransactionHistoryItem],
    summary="U012 - Lịch sử giao dịch thanh toán",
)
def get_payment_history(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Trả về lịch sử giao dịch của user đang đăng nhập.
    Được sử dụng trên S13 (Cài đặt tài khoản) — hiển thị hóa đơn đã thanh toán.
    """
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .options(joinedload(Transaction.membership_plan))
        .order_by(Transaction.created_at.desc())
        .all()
    )

    result = []
    for txn in transactions:
        plan_name = txn.membership_plan.name if txn.membership_plan else None
        result.append(
            TransactionHistoryItem(
                id=txn.id,
                plan_name=plan_name,
                amount=float(txn.amount),
                status=txn.status,
                created_at=txn.created_at,
                vnp_transaction_no=txn.vnp_transaction_no,
            )
        )
    return result
