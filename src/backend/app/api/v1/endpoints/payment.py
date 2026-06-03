"""
Membership Billing & VNPAY Payment Routing Handler.
Assigned Member: Nguyễn Duy Trường (U011, U012 - TC-007 to TC-012).

Endpoints:
  GET  /plans              — List membership plans (public)
  GET  /membership/status  — Current user's membership status (auth required)
  POST /vnpay/checkout     — Create transaction + generate VNPAY checkout URL (auth required)
  GET  /vnpay/ipn          — VNPAY server-to-server IPN callback (public, checksum verified)
  GET  /history            — User's transaction history (auth required)
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.api import deps
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
    VNPAYIPNResponse,
)
from app.services import membership_service as membership_svc
from app.services import payment_service as payment_svc


router = APIRouter()
membership_router = APIRouter()


# ---------------------------------------------------------------------------
# U011 — Membership Plans
# ---------------------------------------------------------------------------


@membership_router.get("/plans", response_model=List[MembershipPlanResponse], summary="U011 - Danh mục các gói cước Premium")
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
                Transaction.user_id == current_user.id,
                Transaction.status == "success"
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
# U012 — VNPAY Payment
# ---------------------------------------------------------------------------


@router.post(
    "/vnpay/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="U012 - Khởi tạo hóa đơn và sinh checkout URL VNPAY",
)
@membership_router.post(
    "/checkout",
    response_model=CheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="U011/U012 - Khởi tạo checkout Membership",
)
def checkout(
    body: CheckoutRequest,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Tạo giao dịch mới (pending) và sinh URL thanh toán VNPAY.
    Frontend sẽ redirect user sang VNPAY gateway.
    """
    if current_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản quản trị viên không thể thực hiện giao dịch thanh toán."
        )
    # Validate plan exists
    plan = membership_svc.get_plan_by_id(db, body.plan_id)
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Gói cước '{body.plan_id}' không tồn tại.",
        )

    # Generate unique transaction reference
    vnp_txn_ref = payment_svc.generate_txn_ref()

    # Create pending transaction record
    transaction = Transaction(
        id=uuid.uuid4(),
        user_id=current_user.id,
        plan_id=plan.id,
        amount=float(plan.price),
        vnp_txn_ref=vnp_txn_ref,
        status="pending",
    )
    db.add(transaction)
    db.commit()

    # Get client IP
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Build VNPAY payment URL
    order_info = f"YAG Premium - {plan.name}"
    payment_url = payment_svc.generate_vnpay_url(
        vnp_txn_ref=vnp_txn_ref,
        amount=float(plan.price),
        ip_addr=client_ip,
        order_info=order_info,
        return_url=body.return_url,
    )

    return CheckoutResponse(
        payment_url=payment_url,
        vnp_txn_ref=vnp_txn_ref,
        paymentUrl=payment_url,
        transactionId=vnp_txn_ref,
    )


@router.get(
    "/vnpay/ipn",
    response_model=VNPAYIPNResponse,
    summary="U012 - Endpoint IPN VNPAY (Server-to-Server callback)",
)
def ipn_callback(
    request: Request,
    db: Session = Depends(deps.get_db),
):
    """
    Callback IPN từ VNPAY — server-to-server, KHÔNG qua trình duyệt.
    KHÔNG yêu cầu JWT nhưng BẮT BUỘC verify HMAC-SHA512 checksum.

    RspCode mapping:
    - 00: Xác nhận thành công
    - 97: Checksum không hợp lệ
    - 02: Transaction không tồn tại
    - 04: Transaction đã xử lý rồi
    """
    query_params = dict(request.query_params)
    rsp_code, message = payment_svc.process_ipn(db, query_params)
    return VNPAYIPNResponse(RspCode=rsp_code, Message=message)


@router.post(
    "/vnpay/verify",
    response_model=PaymentResultResponse,
    summary="U012 - Xác thực kết quả thanh toán cho Frontend",
)
def verify_checkout(
    query_params: dict,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
):
    """
    Nhận tham số chuyển hướng từ VNPAY, kiểm tra chữ ký và trả về trạng thái chi tiết cho S10.
    """
    result = payment_svc.verify_payment_result(db, query_params, current_user=current_user)
    return result


@router.get(
    "/transactions/{vnp_txn_ref}",
    response_model=TransactionStatusResponse,
    summary="U012 - Tra cứu trạng thái giao dịch theo mã VNPAY reference",
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
        .filter(Transaction.vnp_txn_ref == vnp_txn_ref, Transaction.user_id == current_user.id)
        .options(joinedload(Transaction.membership_plan))
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    return TransactionStatusResponse(
        id=transaction.id,
        vnp_txn_ref=transaction.vnp_txn_ref,
        plan_id=transaction.plan_id,
        plan_name=transaction.membership_plan.name if transaction.membership_plan else None,
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
