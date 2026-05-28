from sqlalchemy import Column, String, Integer, Numeric, DateTime, Text, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(String(30), primary_key=True)  # Primary key is VARCHAR(30) (e.g. 'MONTHLY', 'YEARLY')
    name = Column(String(100), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(12, 2), nullable=False)  # price in VND
    description = Column(Text, nullable=True)  # Description of plan benefits
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    transactions = relationship("Transaction", back_populates="membership_plan")

    __table_args__ = (
        CheckConstraint("duration_days > 0", name="chk_membership_plans_duration_days"),
        CheckConstraint("price >= 0.0", name="chk_membership_plans_price"),
    )
