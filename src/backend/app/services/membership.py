"""
Membership Service — Business logic for membership plans and subscription status.

Use Case: U011 (Đăng ký Membership).
"""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.membership_plan import MembershipPlan
from app.models.user import User


def get_all_plans(db: Session) -> List[MembershipPlan]:
    """Retrieve all available membership plans ordered by price ascending."""
    return db.query(MembershipPlan).order_by(MembershipPlan.price.asc()).all()


def get_plan_by_id(db: Session, plan_id: str) -> Optional[MembershipPlan]:
    """Retrieve a single membership plan by its ID (e.g. 'MONTHLY')."""
    return db.query(MembershipPlan).filter(MembershipPlan.id == plan_id).first()


def is_premium_active(user: User) -> bool:
    """Check whether a user's premium subscription is currently active."""
    if user.premium_until is None:
        return False
    return user.premium_until > datetime.now(timezone.utc)
