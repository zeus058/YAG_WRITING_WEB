import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey, Index, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    story_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stories.id", ondelete="CASCADE"),
        nullable=False,
    )
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    moderation_status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    is_premium = Column(Boolean, nullable=False, default=False, server_default="false")
    publish_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    story = relationship("Story", back_populates="chapters")
    comments = relationship("Comment", back_populates="chapter", cascade="all, delete-orphan")
    moderation_log = relationship("AiModerationLog", back_populates="chapter", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("chapter_number > 0", name="chk_chapters_chapter_number"),
        CheckConstraint("moderation_status IN ('pending', 'approved', 'rejected', 'flagged')", name="chk_chapters_moderation_status"),
        Index("idx_chapters_story_number", story_id, chapter_number),
    )
