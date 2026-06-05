"""
Story schemas — Tác phẩm / truyện.

Phục vụ Use Cases: U003 (Tạo & Quản lý Tác phẩm), Screens: S06, S15.
"""

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# ---------------------------------------------------------------------------
# Import modular schemas to satisfy imports in other files
# ---------------------------------------------------------------------------
from app.schemas.chapter import ChapterCreate, ChapterUpdate, ChapterResponse  # noqa: F401
from app.schemas.comment import CommentCreate, CommentResponse  # noqa: F401
from app.schemas.review import ReviewCreate, ReviewResponse  # noqa: F401

StoryStatus = Literal["ongoing", "completed", "paused"]

# ---------------------------------------------------------------------------
# Nested schemas
# ---------------------------------------------------------------------------


class AuthorBrief(BaseModel):
    """Thông tin tóm tắt của tác giả, nhúng trong Story response."""

    user_id: uuid.UUID = Field(..., description="ID tác giả")
    display_name: str = Field(..., description="Bút danh")
    avatar_url: Optional[str] = Field(default=None, description="URL ảnh đại diện")
    reputation_score: Optional[int] = Field(default=None, description="Điểm uy tín")


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
    language: str = Field(default="vi", description="Ngôn ngữ chính của tác phẩm")
    story_type: str = Field(default="fiction", description="Loại hình văn bản")
    tags: Optional[str] = Field(default=None, description="Danh sách tag, phân tách bằng dấu phẩy")
    copyright: str = Field(default="all_rights_reserved", description="Thiết lập bản quyền")
    is_mature: bool = Field(default=False, description="Đánh dấu nội dung trưởng thành")
    main_characters: Optional[str] = Field(default=None, description="Các nhân vật chính")
    target_audience: Optional[str] = Field(default=None, description="Độc giả mục tiêu")
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
    language: Optional[str] = Field(default=None, description="Ngôn ngữ chính")
    story_type: Optional[str] = Field(default=None, description="Loại hình văn bản")
    tags: Optional[str] = Field(default=None, description="Danh sách tag")
    copyright: Optional[str] = Field(default=None, description="Thiết lập bản quyền")
    is_mature: Optional[bool] = Field(default=None, description="Nội dung trưởng thành")
    main_characters: Optional[str] = Field(default=None, description="Các nhân vật chính")
    target_audience: Optional[str] = Field(default=None, description="Độc giả mục tiêu")
    status: Optional[StoryStatus] = Field(
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
    language: str = Field(default="vi", description="Ngôn ngữ chính")
    story_type: str = Field(default="fiction", description="Loại hình văn bản")
    tags: Optional[str] = Field(default=None, description="Danh sách tag")
    copyright: str = Field(default="all_rights_reserved", description="Thiết lập bản quyền")
    is_mature: bool = Field(default=False, description="Nội dung trưởng thành")
    main_characters: Optional[str] = Field(default=None, description="Các nhân vật chính")
    target_audience: Optional[str] = Field(default=None, description="Độc giả mục tiêu")
    status: str = Field(..., description="Trạng thái (ongoing / completed / paused)")
    view_count: int = Field(..., description="Lượt xem")
    rating_avg: float = Field(..., description="Điểm đánh giá trung bình (0-5)")
    rating_count: Optional[int] = Field(default=0, description="Số lượt đánh giá")
    chapter_count: Optional[int] = Field(default=0, description="Số chương")
    draft_count: Optional[int] = Field(default=0, description="Số chương nháp")
    pending_count: Optional[int] = Field(default=0, description="Số chương chờ duyệt AI")
    created_at: datetime = Field(..., description="Ngày tạo")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")

    @field_validator("language", mode="before")
    @classmethod
    def default_language(cls, value):
        return value or "vi"

    @field_validator("story_type", mode="before")
    @classmethod
    def default_story_type(cls, value):
        return value or "fiction"

    @field_validator("copyright", mode="before")
    @classmethod
    def default_copyright(cls, value):
        return value or "all_rights_reserved"

    @field_validator("is_mature", mode="before")
    @classmethod
    def default_is_mature(cls, value):
        return False if value is None else value

    model_config = ConfigDict(from_attributes=True)


class StoryListItem(BaseModel):
    """Item tóm tắt trong danh sách tác phẩm."""

    id: uuid.UUID = Field(..., description="ID tác phẩm")
    title: str = Field(..., description="Tiêu đề")
    author: AuthorBrief = Field(..., description="Thông tin tác giả")
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa")
    category: str = Field(..., description="Thể loại")
    language: str = Field(default="vi", description="Ngôn ngữ chính")
    story_type: str = Field(default="fiction", description="Loại hình văn bản")
    tags: Optional[str] = Field(default=None, description="Danh sách tag")
    copyright: str = Field(default="all_rights_reserved", description="Thiết lập bản quyền")
    is_mature: bool = Field(default=False, description="Nội dung trưởng thành")
    main_characters: Optional[str] = Field(default=None, description="Các nhân vật chính")
    target_audience: Optional[str] = Field(default=None, description="Độc giả mục tiêu")
    status: str = Field(..., description="Trạng thái")
    view_count: int = Field(..., description="Lượt xem")
    rating_avg: float = Field(..., description="Điểm đánh giá trung bình")
    chapter_count: Optional[int] = Field(default=0, description="Số chương")
    updated_at: datetime = Field(..., description="Lần cập nhật cuối")

    @field_validator("language", mode="before")
    @classmethod
    def default_language(cls, value):
        return value or "vi"

    @field_validator("story_type", mode="before")
    @classmethod
    def default_story_type(cls, value):
        return value or "fiction"

    @field_validator("copyright", mode="before")
    @classmethod
    def default_copyright(cls, value):
        return value or "all_rights_reserved"

    @field_validator("is_mature", mode="before")
    @classmethod
    def default_is_mature(cls, value):
        return False if value is None else value

    model_config = ConfigDict(from_attributes=True)


class StoryListResponse(BaseModel):
    """Response phân trang cho danh sách tác phẩm."""

    items: List[StoryListItem] = Field(..., description="Danh sách tác phẩm")
    total: int = Field(..., description="Tổng số tác phẩm")
    page: int = Field(..., description="Trang hiện tại")
    limit: int = Field(..., description="Số lượng mỗi trang")
    total_pages: int = Field(..., description="Tổng số trang")


# ---------------------------------------------------------------------------
# U003/U004 additions
# ---------------------------------------------------------------------------


class StoryDetailResponse(StoryResponse):
    chapters: List[ChapterResponse] = Field(default_factory=list)


class ChapterReadResponse(ChapterResponse):
    cache_status: Literal["hit", "miss", "bypass"]
    view_count_buffered: bool


class BookmarkResponse(BaseModel):
    story_id: uuid.UUID
    bookmarked: bool
    message: str


class MessageResponse(BaseModel):
    message: str


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentTreeResponse(CommentResponse):
    replies: List["CommentTreeResponse"] = Field(default_factory=list)


class CommentTreeListResponse(BaseModel):
    comments: List[CommentTreeResponse]


class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]


# Rebuild self-referencing model
CommentTreeResponse.model_rebuild()
