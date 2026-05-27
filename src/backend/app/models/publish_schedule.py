import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class PublishSchedule(Base):
    __tablename__ = "publish_schedules"

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
    scheduled_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default="scheduled",
        server_default="scheduled",
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    story = relationship("Story", back_populates="publish_schedules")

    __table_args__ = (
        CheckConstraint("status IN ('scheduled', 'published', 'missed')", name="chk_publish_schedules_status_valid"),
    )
