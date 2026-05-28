import uuid
from sqlalchemy import Column, String, Text, Integer, Numeric, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Story(Base):
    __tablename__ = "stories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), index=True) # Explicitly define without ForeignKey to users.id if users table doesn't exist yet
    title = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=False)
    cover_url = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False)
    status = Column(String(20), default='ongoing') # ongoing, completed, paused
    view_count = Column(Integer, default=0)
    rating_avg = Column(Numeric(3, 2), default=0.00)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chapters = relationship("Chapter", back_populates="story", cascade="all, delete-orphan")

class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"))
    chapter_number = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    moderation_status = Column(String(20), default='pending') # pending, approved, rejected, flagged
    is_premium = Column(Boolean, default=False) # True = cần Membership
    
    publish_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    story = relationship("Story", back_populates="chapters")
