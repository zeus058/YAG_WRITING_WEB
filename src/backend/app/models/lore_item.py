"""SQLAlchemy model for story_lores table (Lorebook / World-building entries)."""

import uuid

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.sql import func

from app.core.database import Base


class StoryLore(Base):
    __tablename__ = "story_lores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_name = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)  # character, location, item, skill, other
    description = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(
        TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<StoryLore {self.entity_name} ({self.entity_type})>"
