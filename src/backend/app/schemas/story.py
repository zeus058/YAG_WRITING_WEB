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
