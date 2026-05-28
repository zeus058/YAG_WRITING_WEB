from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class ChapterBase(BaseModel):
    title: str
    chapter_number: int
    content: str
    is_premium: Optional[bool] = False

class ChapterResponse(ChapterBase):
    id: UUID
    story_id: UUID
    moderation_status: str
    publish_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class StoryCreate(BaseModel):
    title: str
    description: str
    category: str
    # cover_url will be handled separately if needed, or included here. U003 says load from client. Let's make it optional.
    cover_url: Optional[str] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    cover_url: Optional[str] = None

class StoryResponse(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    description: str
    category: str
    status: str
    cover_url: Optional[str]
    view_count: int
    rating_avg: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class StoryDetailResponse(StoryResponse):
    chapters: List[ChapterResponse] = []
