"""
Chapter schemas — Chương truyện.

Phục vụ Use Cases: U004 (Soạn thảo chương), U005 (Xuất bản chương).
Screens: S16 (Author Studio), S17 (Xuất bản), S07 (Reader Mode).
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ChapterCreate(BaseModel):
    """Schema tạo chương mới (draft)."""

    story_id: uuid.UUID = Field(..., description="ID tác phẩm chứa chương")
    chapter_number: int = Field(..., gt=0, description="Số thứ tự chương (> 0)")
    title: str = Field(..., max_length=255, description="Tiêu đề chương")
    content: str = Field(..., description="Nội dung chương")
    is_premium: bool = Field(
        default=False, description="Chương Premium (cần Membership để đọc)"
    )


class ChapterUpdate(BaseModel):
    """Schema cập nhật chương (partial update / autosave)."""

    title: Optional[str] = Field(
        default=None, max_length=255, description="Tiêu đề mới"
    )
    content: Optional[str] = Field(default=None, description="Nội dung mới")
    is_premium: Optional[bool] = Field(default=None, description="Cập nhật trạng thái Premium")


class ChapterPublishRequest(BaseModel):
    """Schema yêu cầu xuất bản chương (có thể hẹn giờ)."""

    scheduled_time: Optional[datetime] = Field(
        default=None,
        description="Thời gian hẹn xuất bản (null = xuất bản ngay lập tức)",
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ChapterResponse(BaseModel):
    """Chi tiết đầy đủ một chương."""

    id: uuid.UUID = Field(..., description="ID chương")
    story_id: uuid.UUID = Field(..., description="ID tác phẩm")
    chapter_number: int = Field(..., description="Số thứ tự chương")
    title: str = Field(..., description="Tiêu đề chương")
    content: str = Field(..., description="Nội dung chương")
    is_premium: bool = Field(..., description="Chương Premium")
    moderation_status: str = Field(
        ..., description="Trạng thái kiểm duyệt (pending / approved / rejected / flagged)"
    )
    publish_at: Optional[datetime] = Field(default=None, description="Thời gian xuất bản")
    prev_chapter: Optional[int] = Field(
        default=None, description="Số chương trước (null nếu là chương đầu)"
    )
    next_chapter: Optional[int] = Field(
        default=None, description="Số chương sau (null nếu là chương cuối)"
    )
    created_at: datetime = Field(..., description="Ngày tạo")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")

    model_config = ConfigDict(from_attributes=True)


class ChapterListItem(BaseModel):
    """Item tóm tắt trong danh sách chương (không kèm content)."""

    id: uuid.UUID = Field(..., description="ID chương")
    chapter_number: int = Field(..., description="Số thứ tự chương")
    title: str = Field(..., description="Tiêu đề chương")
    moderation_status: str = Field(..., description="Trạng thái kiểm duyệt")
    is_premium: bool = Field(..., description="Chương Premium")
    publish_at: Optional[datetime] = Field(default=None, description="Thời gian xuất bản")

    model_config = ConfigDict(from_attributes=True)
