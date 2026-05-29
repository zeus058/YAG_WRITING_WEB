"""
Story schemas — Tác phẩm / truyện.

Phục vụ Use Cases: U003 (Tạo & Quản lý Tác phẩm), Screens: S06, S15.
"""

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Nested schemas
# ---------------------------------------------------------------------------


class AuthorBrief(BaseModel):
    """Thông tin tóm tắt của tác giả, nhúng trong Story response."""

    user_id: uuid.UUID = Field(..., description="ID tác giả")
    display_name: str = Field(..., description="Bút danh")
    avatar_url: Optional[str] = Field(default=None, description="URL ảnh đại diện")
    reputation_score: Optional[int] = Field(default=None, description="Điểm uy tín")

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class StoryCreate(BaseModel):
    """Schema tạo tác phẩm mới."""

    title: str = Field(
        ..., min_length=3, max_length=255, description="Tiêu đề tác phẩm"
    )
    description: str = Field(
        ..., min_length=50, description="Tóm tắt cốt truyện (tối thiểu 50 ký tự)"
    )
    category: str = Field(..., description="Thể loại (Kiếm hiệp, Kỳ ảo, ...)")
    cover_url: Optional[str] = Field(
        default=None, description="URL ảnh bìa (Cloudinary)"
    )


class StoryUpdate(BaseModel):
    """Schema cập nhật thông tin tác phẩm (partial update)."""

    title: Optional[str] = Field(
        default=None, min_length=3, max_length=255, description="Tiêu đề mới"
    )
    description: Optional[str] = Field(
        default=None, min_length=50, description="Tóm tắt mới"
    )
    category: Optional[str] = Field(default=None, description="Thể loại mới")
    status: Optional[Literal["ongoing", "completed", "paused"]] = Field(
        default=None, description="Trạng thái tác phẩm"
    )
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa mới")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class StoryResponse(BaseModel):
    """Chi tiết đầy đủ một tác phẩm."""

    id: uuid.UUID = Field(..., description="ID tác phẩm")
    title: str = Field(..., description="Tiêu đề")
    description: str = Field(..., description="Tóm tắt cốt truyện")
    author: AuthorBrief = Field(..., description="Thông tin tác giả")
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa")
    category: str = Field(..., description="Thể loại")
    status: str = Field(..., description="Trạng thái (ongoing / completed / paused)")
    view_count: int = Field(..., description="Lượt xem")
    rating_avg: float = Field(..., description="Điểm đánh giá trung bình (0-5)")
    rating_count: Optional[int] = Field(default=0, description="Số lượt đánh giá")
    chapter_count: Optional[int] = Field(default=0, description="Số chương")
    created_at: datetime = Field(..., description="Ngày tạo")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")

    model_config = ConfigDict(from_attributes=True)


class StoryListItem(BaseModel):
    """Item tóm tắt trong danh sách tác phẩm."""

    id: uuid.UUID = Field(..., description="ID tác phẩm")
    title: str = Field(..., description="Tiêu đề")
    author: AuthorBrief = Field(..., description="Thông tin tác giả")
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa")
    category: str = Field(..., description="Thể loại")
    status: str = Field(..., description="Trạng thái")
    view_count: int = Field(..., description="Lượt xem")
    rating_avg: float = Field(..., description="Điểm đánh giá trung bình")
    chapter_count: Optional[int] = Field(default=0, description="Số chương")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")

    model_config = ConfigDict(from_attributes=True)


class StoryListResponse(BaseModel):
    """Response phân trang cho danh sách tác phẩm."""

    items: List[StoryListItem] = Field(..., description="Danh sách tác phẩm")
    total: int = Field(..., description="Tổng số tác phẩm")
    page: int = Field(..., description="Trang hiện tại")
    limit: int = Field(..., description="Số lượng mỗi trang")
    total_pages: int = Field(..., description="Tổng số trang")
