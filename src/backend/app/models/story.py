import uuid
from sqlalchemy import Column, String, Integer, Text, Numeric, DateTime, ForeignKey, CheckConstraint, text
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
    )
    title = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=False)
    cover_url = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="ongoing", server_default="ongoing")
    view_count = Column(Integer, nullable=False, default=0, server_default="0")
    rating_avg = Column(Numeric(3, 2), nullable=False, default=0.00, server_default="0.00")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    author = relationship("User", back_populates="stories")
    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")
    embedding_record = relationship("StoryEmbedding", back_populates="story", uselist=False, cascade="all, delete-orphan")
    publish_schedules = relationship("PublishSchedule", back_populates="story", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="story", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('ongoing', 'completed', 'paused')", name="chk_stories_status"),
    )
