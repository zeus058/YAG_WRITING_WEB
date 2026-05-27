import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, CheckConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    plan_id = Column(
        String(30),
        ForeignKey("membership_plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount = Column(Numeric(12, 2), nullable=False)
    vnp_txn_ref = Column(String(100), nullable=False, unique=True, index=True)
    vnp_transaction_no = Column(String(100), nullable=True, unique=True, index=True)
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="transactions")
    membership_plan = relationship("MembershipPlan", back_populates="transactions")

    __table_args__ = (
        CheckConstraint("amount > 0", name="chk_transactions_amount_positive"),
        CheckConstraint("status IN ('pending', 'success', 'failed')", name="chk_transactions_status_valid"),
    )
