import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Numeric,
    DateTime,
    ForeignKey,
    CheckConstraint,
    Boolean,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Story(Base):
    __tablename__ = "stories"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    cover_url = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False, index=True)
    language = Column(String(30), nullable=False, default="vi", server_default="vi")
    story_type = Column(
        String(30), nullable=False, default="fiction", server_default="fiction"
    )
    tags = Column(Text, nullable=True)
    copyright = Column(
        String(50),
        nullable=False,
        default="all_rights_reserved",
        server_default="all_rights_reserved",
    )
    is_mature = Column(Boolean, nullable=False, default=False, server_default="false")
    main_characters = Column(Text, nullable=True)
    target_audience = Column(String(50), nullable=True)
    style_reference_story_title = Column(String(255), nullable=True)
    style_reference_series_title = Column(String(255), nullable=True)
    style_reference_author = Column(String(255), nullable=True)
    status = Column(
        String(20), nullable=False, default="ongoing", server_default="ongoing"
    )
    view_count = Column(Integer, nullable=False, default=0, server_default="0")
    rating_avg = Column(
        Numeric(3, 2), nullable=False, default=0.00, server_default="0.00"
    )
    expected_chapters = Column(Integer, nullable=False, default=0, server_default="0")
    update_frequency = Column(
        String(50), nullable=False, default="1_week_1_chap", server_default="'1_week_1_chap'"
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    author = relationship("User", back_populates="stories")
    chapters = relationship(
        "Chapter", back_populates="story", cascade="all, delete-orphan"
    )
    embedding_record = relationship(
        "StoryEmbedding",
        back_populates="story",
        uselist=False,
        cascade="all, delete-orphan",
    )
    publish_schedules = relationship(
        "PublishSchedule", back_populates="story", cascade="all, delete-orphan"
    )
    reviews = relationship(
        "Review", back_populates="story", cascade="all, delete-orphan"
    )

    @property
    def chapter_count(self) -> int:
        return len(self.chapters)

    @property
    def chapter_count_published(self) -> int:
        now = datetime.now(timezone.utc)
        return sum(
            1
            for c in self.chapters
            if c.moderation_status == "approved" and c.publish_at <= now
        )

    @property
    def rating_count(self) -> int:
        return len(self.reviews)

    @property
    def draft_count(self) -> int:
        return sum(
            1
            for c in self.chapters
            if c.moderation_status == "draft"
        )

    @property
    def pending_count(self) -> int:
        return sum(
            1
            for c in self.chapters
            if c.moderation_status == "pending"
        )

    __table_args__ = (
        CheckConstraint(
            "status IN ('ongoing', 'completed', 'paused')", name="chk_stories_status"
        ),
        CheckConstraint("view_count >= 0", name="chk_stories_view_count_non_negative"),
        CheckConstraint(
            "rating_avg >= 0.00 AND rating_avg <= 5.00",
            name="chk_stories_rating_avg_range",
        ),
    )
