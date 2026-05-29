"""
Membership schemas — Gói hội viên & thanh toán.

Phục vụ Use Cases: U011 (Đăng ký Membership), U012 (Thanh toán VNPAY).
Screens: S09 (Membership), S10 (Kết quả thanh toán).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class MembershipPlanResponse(BaseModel):
    """Thông tin một gói Membership."""

    id: str = Field(..., description="Mã gói (VD: 'MONTHLY', 'YEARLY')")
    name: str = Field(..., description="Tên hiển thị gói")
    duration_days: int = Field(..., description="Số ngày hiệu lực")
    price: float = Field(..., description="Giá gói (VND)")
    description: Optional[str] = Field(default=None, description="Mô tả quyền lợi gói")

    model_config = ConfigDict(from_attributes=True)


class MembershipStatusResponse(BaseModel):
    """Trạng thái Membership hiện tại của người dùng."""

    plan_name: Optional[str] = Field(
        default=None, description="Tên gói đang sử dụng (null nếu chưa đăng ký)"
    )
    premium_until: Optional[datetime] = Field(
        default=None, description="Hạn sử dụng Membership"
    )
    is_active: bool = Field(
        ..., description="Membership còn hiệu lực hay không"
    )


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseModel):
    """Schema yêu cầu thanh toán Membership."""

    plan_id: str = Field(..., description="Mã gói cần thanh toán (VD: 'MONTHLY')")


# ---------------------------------------------------------------------------
# Checkout response
# ---------------------------------------------------------------------------


class CheckoutResponse(BaseModel):
    """Response sau khi tạo giao dịch, trả URL thanh toán VNPAY."""

    payment_url: str = Field(..., description="URL redirect sang VNPAY")
    vnp_txn_ref: str = Field(..., description="Mã tham chiếu giao dịch")
