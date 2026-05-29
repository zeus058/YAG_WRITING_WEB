"""
Comment schemas — Bình luận chương truyện.

Phục vụ Use Cases: U010 (Bình luận & Đánh giá), Screens: S06, S07.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class CommentCreate(BaseModel):
    """Schema tạo bình luận mới."""

    content: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Nội dung bình luận (1-2000 ký tự)",
    )
    parent_id: Optional[uuid.UUID] = Field(
        default=None, description="ID bình luận cha (null = bình luận gốc, có giá trị = reply)"
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class CommentResponse(BaseModel):
    """Bình luận kèm thông tin user và danh sách replies lồng nhau."""

    id: uuid.UUID = Field(..., description="ID bình luận")
    user_id: uuid.UUID = Field(..., description="ID người bình luận")
    username: str = Field(..., description="Tên đăng nhập")
    display_name: str = Field(..., description="Bút danh hiển thị")
    avatar_url: Optional[str] = Field(default=None, description="URL ảnh đại diện")
    chapter_id: uuid.UUID = Field(..., description="ID chương được bình luận")
    parent_id: Optional[uuid.UUID] = Field(default=None, description="ID bình luận cha")
    content: str = Field(..., description="Nội dung bình luận")
    created_at: datetime = Field(..., description="Thời gian tạo")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")
    replies: Optional[List["CommentResponse"]] = Field(
        default=None, description="Danh sách reply lồng nhau"
    )

    model_config = ConfigDict(from_attributes=True)


# Resolve forward reference cho self-referencing `replies` field
CommentResponse.model_rebuild()
