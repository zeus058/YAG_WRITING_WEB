import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    CheckConstraint,
    UniqueConstraint,
    text,
)
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
        index=True,
    )
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    moderation_status = Column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
    )
    is_premium = Column(Boolean, nullable=False, default=False, server_default="false")
    publish_at = Column(DateTime(timezone=True), server_default=func.now())
    word_count = Column(Integer, nullable=False, default=0, server_default="0")
    published_at = Column(DateTime(timezone=True), nullable=True)
    rejected_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    story = relationship("Story", back_populates="chapters")
    comments = relationship(
        "Comment", back_populates="chapter", cascade="all, delete-orphan"
    )
    moderation_log = relationship(
        "AiModerationLog",
        back_populates="chapter",
        uselist=False,
        cascade="all, delete-orphan",
    )
    reading_histories = relationship("ReadingHistory", back_populates="chapter")

    __table_args__ = (
        UniqueConstraint(
            "story_id", "chapter_number", name="uq_chapters_story_chapter_number"
        ),
        CheckConstraint("chapter_number > 0", name="chk_chapters_chapter_number"),
        CheckConstraint(
            "moderation_status IN ('draft', 'pending', 'approved', 'rejected', 'flagged')",
            name="chk_chapters_moderation_status",
        ),
        Index("idx_chapters_story_number", story_id, chapter_number),
        Index(
            "idx_chapters_story_status_publish", story_id, moderation_status, publish_at
        ),
    )
