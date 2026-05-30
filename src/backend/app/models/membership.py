import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(String(30), primary_key=True)
    name = Column(String(100), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    plan_id = Column(String(30), ForeignKey("membership_plans.id"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    vnp_txn_ref = Column(String(100), nullable=False, unique=True, index=True)
    vnp_transaction_no = Column(String(100), nullable=True, unique=True)
    status = Column(String(20), nullable=False, default="pending", server_default="pending", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
