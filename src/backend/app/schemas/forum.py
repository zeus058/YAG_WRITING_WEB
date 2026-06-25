import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ForumReplyCreate(BaseModel):
    """Schema tạo câu trả lời mới trong diễn đàn."""
    content: str = Field(..., min_length=1, max_length=1000)


class ForumReplyResponse(BaseModel):
    """Câu trả lời trong diễn đàn."""
    id: uuid.UUID
    post_id: uuid.UUID
    user_id: uuid.UUID
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    is_verified: bool = False
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ForumPostCreate(BaseModel):
    """Schema tạo bài viết mới trong diễn đàn."""
    content: str = Field(..., min_length=1, max_length=2000)


class ForumPostResponse(BaseModel):
    """Bài viết trong diễn đàn kèm thông tin tác giả và câu trả lời."""
    id: uuid.UUID
    user_id: uuid.UUID
    authorName: str = Field(..., serialization_alias="authorName")
    authorAvatar: Optional[str] = Field(None, serialization_alias="authorAvatar")
    isVerified: bool = Field(False, serialization_alias="isVerified")
    content: str
    likes: int = Field(default=0, serialization_alias="likes")
    liked: bool = Field(default=False, serialization_alias="liked")
    replies: List[ForumReplyResponse] = Field(default_factory=list, serialization_alias="replies")
    createdAt: datetime = Field(..., serialization_alias="createdAt")
    updatedAt: datetime = Field(..., serialization_alias="updatedAt")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )
