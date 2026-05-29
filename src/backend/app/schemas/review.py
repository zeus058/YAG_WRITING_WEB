"""
Review schemas — Đánh giá tác phẩm.

Phục vụ Use Cases: U010 (Bình luận & Đánh giá).
Ràng buộc: Mỗi user chỉ được đánh giá 1 lần/tác phẩm (UNIQUE user_id, story_id).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ReviewCreate(BaseModel):
    """Schema tạo đánh giá tác phẩm."""

    rating: int = Field(
        ..., ge=1, le=5, description="Điểm đánh giá (1-5 sao)"
    )
    content: Optional[str] = Field(
        default=None, max_length=2000, description="Nhận xét (tùy chọn, tối đa 2000 ký tự)"
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ReviewResponse(BaseModel):
    """Đánh giá kèm thông tin user."""

    id: uuid.UUID = Field(..., description="ID đánh giá")
    user_id: uuid.UUID = Field(..., description="ID người đánh giá")
    username: str = Field(..., description="Tên đăng nhập")
    display_name: str = Field(..., description="Bút danh hiển thị")
    story_id: uuid.UUID = Field(..., description="ID tác phẩm")
    rating: int = Field(..., description="Điểm đánh giá (1-5)")
    content: Optional[str] = Field(default=None, description="Nhận xét")
    created_at: datetime = Field(..., description="Thời gian đánh giá")

    model_config = ConfigDict(from_attributes=True)
