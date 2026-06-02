import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class AdminAlert(Base):
    __tablename__ = "admin_alerts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    alert_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="warning", server_default="warning")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    story_id = Column(UUID(as_uuid=True), ForeignKey("stories.id", ondelete="CASCADE"), nullable=True)
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
