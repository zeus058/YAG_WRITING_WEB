import uuid
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Story(Base):
    __tablename__ = "stories"
    __table_args__ = (
        CheckConstraint("status IN ('ongoing', 'completed', 'paused')", name="ck_stories_status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    # F1 auth/user tables are not implemented in this skeleton yet.
    # Keep the UUID contract now; add ForeignKey("users.id") when User exists.
    author_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    cover_url = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False)
    status = Column(String(20), default="ongoing", nullable=False)
    view_count = Column(Integer, default=0)
    rating_avg = Column(Numeric(3, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (
        CheckConstraint("chapter_number > 0", name="ck_chapters_chapter_number_positive"),
        CheckConstraint(
            "moderation_status IN ('pending', 'approved', 'rejected', 'flagged')",
            name="ck_chapters_moderation_status",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False)
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    moderation_status = Column(String(20), default="pending", nullable=False)
    is_premium = Column(Boolean, default=False, nullable=False)
    
    publish_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    story = relationship("Story", back_populates="chapters")
    comments = relationship("Comment", back_populates="chapter", cascade="all, delete-orphan")


class ReadingHistory(Base):
    __tablename__ = "reading_histories"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE"), primary_key=True)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    chapter = relationship("Chapter")


class Library(Base):
    __tablename__ = "libraries"

    user_id = Column(UUID(as_uuid=True), primary_key=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True)
    bookmarked_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    story = relationship("Story")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    chapter_id = Column(UUID(as_uuid=True), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapter = relationship("Chapter", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
        UniqueConstraint("user_id", "story_id", name="uq_reviews_user_story"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    story = relationship("Story")
