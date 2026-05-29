import uuid
from sqlalchemy import Column, String, DateTime, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, server_default="reader")
    premium_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    stories = relationship("Story", back_populates="author", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    reading_histories = relationship("ReadingHistory", back_populates="user")
    libraries = relationship("Library", back_populates="user")

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'author', 'reader')", name="chk_users_role"),
    )
