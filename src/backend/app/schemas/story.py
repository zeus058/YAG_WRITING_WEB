from pydantic import BaseModel, ConfigDict, Field
from typing import Literal, Optional, List
from datetime import datetime
from uuid import UUID

StoryStatus = Literal["ongoing", "completed", "paused"]
ModerationStatus = Literal["pending", "approved", "rejected", "flagged"]

class ChapterBase(BaseModel):
    title: str
    chapter_number: int
    content: str
    is_premium: Optional[bool] = False


class ChapterCreate(ChapterBase):
    story_id: UUID


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_premium: Optional[bool] = None


class ChapterResponse(ChapterBase):
    id: UUID
    story_id: UUID
    moderation_status: ModerationStatus
    publish_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ChapterReadResponse(ChapterResponse):
    cache_status: Literal["hit", "miss", "bypass"]
    view_count_buffered: bool


class BookmarkResponse(BaseModel):
    story_id: UUID
    bookmarked: bool
    message: str


class MessageResponse(BaseModel):
    message: str


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[UUID] = None


class CommentResponse(BaseModel):
    id: UUID
    user_id: UUID
    chapter_id: UUID
    content: str
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CommentListResponse(BaseModel):
    comments: List[CommentResponse]


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentTreeResponse(CommentResponse):
    replies: List["CommentTreeResponse"] = Field(default_factory=list)


class CommentTreeListResponse(BaseModel):
    comments: List[CommentTreeResponse]


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    content: Optional[str] = None


class ReviewResponse(BaseModel):
    id: UUID
    user_id: UUID
    story_id: UUID
    rating: int
    content: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]

class StoryCreate(BaseModel):
    title: str
    description: str
    category: str
    cover_url: Optional[str] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[StoryStatus] = None
    cover_url: Optional[str] = None

class StoryResponse(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    description: str
    category: str
    status: StoryStatus
    cover_url: Optional[str]
    view_count: int
    rating_avg: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StoryDetailResponse(StoryResponse):
    chapters: List[ChapterResponse] = Field(default_factory=list)
