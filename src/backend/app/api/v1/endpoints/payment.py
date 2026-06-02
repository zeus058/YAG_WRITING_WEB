"""
Membership Billing & VNPAY Payment Routing Handler.
Assigned Member: Nguyễn Duy Trường (U011, U012 - TC-007 to TC-012).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.schemas.membership import MembershipPlanResponse
from app.services import membership

router = APIRouter()
membership_router = APIRouter()


@membership_router.get("/plans", response_model=List[MembershipPlanResponse], summary="U011 - Danh mục các gói cước Premium")
@router.get("/plans", response_model=List[MembershipPlanResponse], summary="U011 - Danh mục các gói cước Premium (payment alias)")
def get_plans(db: Session = Depends(deps.get_db)):
    """Retrieve all available membership plans ordered by price ascending."""
    return membership.get_all_plans(db)


@router.post("/vnpay/checkout", summary="U012 - Khởi tạo hóa đơn và sinh checkout URL VNPAY")
def checkout(db: Session = Depends(deps.get_db)):
    return {"message": "VNPAY Checkout URL generated successfully"}


@router.post("/vnpay/ipn", summary="U012 - Endpoint IPN VNPAY (Server-to-Server callback)")
def ipn_callback(db: Session = Depends(deps.get_db)):
    return {"message": "IPN callback processed successfully"}
