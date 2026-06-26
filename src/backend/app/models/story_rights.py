from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class StoryRights(Base):
    __tablename__ = "story_rights"

    story_id = Column(
        UUID(as_uuid=True),
        ForeignKey("stories.id", ondelete="CASCADE"),
        primary_key=True,
    )
    source_type = Column(String(40), nullable=False)
    original_author = Column(String(255), nullable=True)
    rights_holder = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=True)
    license_code = Column(String(80), nullable=False)
    license_url = Column(Text, nullable=True)
    commercial_use_allowed = Column(Boolean, nullable=False, default=False)
    derivatives_allowed = Column(Boolean, nullable=False, default=False)
    translation_rights = Column(String(80), nullable=True)
    provenance_note = Column(Text, nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    verified_by = Column(String(255), nullable=False)
    import_batch_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    story = relationship("Story", back_populates="rights_record")
