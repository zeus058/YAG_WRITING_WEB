import uuid
from sqlalchemy import Column, String, Boolean, Float, Text, ForeignKey, DateTime, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class AiModerationLog(Base):
    __tablename__ = "ai_moderation_logs"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    chapter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chapters.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    is_violation = Column(Boolean, nullable=False, default=False)
    violation_category = Column(String(50), nullable=True)
    confidence_score = Column(Float, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    chapter = relationship("Chapter", back_populates="moderation_log")

    __table_args__ = (
        CheckConstraint("confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0)", name="chk_ai_moderation_logs_confidence_score_range"),
    )
