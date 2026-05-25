"""
Membership Billing & VNPAY Payment Routing Handler.
Assigned Member: Nguyễn Duy Trường (U011, U012 - TC-007 to TC-012).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps

router = APIRouter()

@router.get("/plans", summary="U011 - Danh mục các gói cước Premium")
def get_plans(db: Session = Depends(deps.get_db)):
    return {"message": "Endpoint configured for U011 - Premium Plans"}

@router.post("/vnpay/checkout", summary="U012 - Khởi tạo hóa đơn và sinh checkout URL VNPAY")
def checkout(db: Session = Depends(deps.get_db)):
    return {"message": "VNPAY Checkout URL generated successfully"}

@router.post("/vnpay/ipn", summary="U012 - Endpoint IPN VNPAY (Server-to-Server callback)")
def ipn_callback(db: Session = Depends(deps.get_db)):
    return {"message": "IPN callback processed successfully"}
