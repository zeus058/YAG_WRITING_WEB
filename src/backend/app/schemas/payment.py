"""
Payment schemas — VNPAY IPN callback & kết quả thanh toán.

Phục vụ Use Cases: U012 (Thanh toán VNPAY).
Screen: S10 (Kết quả thanh toán).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# VNPAY IPN
# ---------------------------------------------------------------------------


class VNPAYIPNResponse(BaseModel):
    """Response trả về cho VNPAY IPN callback (theo format VNPAY quy định)."""

    RspCode: str = Field(..., description="Mã phản hồi (VD: '00' = thành công)")
    Message: str = Field(..., description="Mô tả kết quả xử lý")


# ---------------------------------------------------------------------------
# Payment result (cho Frontend)
# ---------------------------------------------------------------------------


class PaymentResultResponse(BaseModel):
    """Kết quả thanh toán hiển thị cho người dùng trên S10."""

    success: bool = Field(..., description="Thanh toán thành công hay không")
    transaction_id: Optional[uuid.UUID] = Field(
        default=None, description="ID giao dịch"
    )
    plan_name: Optional[str] = Field(
        default=None, description="Tên gói đã thanh toán"
    )
    amount: Optional[float] = Field(
        default=None, description="Số tiền (VND)"
    )
    premium_until: Optional[datetime] = Field(
        default=None, description="Hạn Membership sau thanh toán"
    )
    message: str = Field(..., description="Thông báo kết quả")


class TransactionHistoryItem(BaseModel):
    """Một bản ghi lịch sử giao dịch."""

    id: uuid.UUID = Field(..., description="ID giao dịch")
    plan_name: Optional[str] = Field(default=None, description="Tên gói đã thanh toán")
    amount: float = Field(..., description="Số tiền (VND)")
    status: str = Field(..., description="Trạng thái: pending / success / failed")
    created_at: Optional[datetime] = Field(default=None, description="Thời gian tạo giao dịch")
    vnp_transaction_no: Optional[str] = Field(default=None, description="Mã giao dịch VNPAY")

    model_config = ConfigDict(from_attributes=True)

