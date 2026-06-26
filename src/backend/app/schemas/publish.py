from datetime import datetime
from typing import Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class PublishChapterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    publish_at: Optional[datetime] = Field(
        default=None,
        validation_alias=AliasChoices("publish_at", "scheduleAt", "scheduled_time"),
        description="When the chapter becomes visible after moderation approval.",
    )
    is_premium: bool = Field(
        default=False,
        validation_alias=AliasChoices("is_premium", "isPremium"),
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
