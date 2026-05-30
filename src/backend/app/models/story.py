import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
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
    category = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="ongoing", server_default="ongoing")
    view_count = Column(Integer, nullable=False, default=0, server_default="0")
    rating_avg = Column(Numeric(3, 2), nullable=False, default=0, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
