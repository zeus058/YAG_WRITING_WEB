from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class PublishChapterRequest(BaseModel):
    publish_at: Optional[datetime] = Field(
        default=None,
        description="When the chapter becomes visible after moderation approval.",
    )
    is_premium: bool = Field(
        default=False,
        description="True if the chapter requires an active membership.",
    )


class PublishChapterResponse(BaseModel):
    status: str
    message: str
    chapter_id: str
    story_id: str
    queue: str
    moderation_status: str
    publish_at: Optional[datetime]
    is_premium: bool
    queued_at: str
