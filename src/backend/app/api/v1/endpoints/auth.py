"""
Authentication & Profile Routing Handler.
Assigned Member: Trần Gia Hiển (U001, U002 - TC-001 to TC-006).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps

router = APIRouter()

@router.post("/register", summary="U001 - Đăng ký tài khoản mới")
def register(db: Session = Depends(deps.get_db)):
    return {"message": "Endpoint configured for U001 - Register"}

@router.post("/login", summary="U001 - Đăng nhập tài khoản")
def login(db: Session = Depends(deps.get_db)):
    return {"message": "Endpoint configured for U001 - Login"}

@router.post("/password-reset/request", summary="U001 - Yêu cầu khôi phục mật khẩu qua OTP")
def reset_request(db: Session = Depends(deps.get_db)):
    return {"message": "OTP sent via Gmail SMTP"}

@router.put("/profiles/me", summary="U002 - Cập nhật hồ sơ cá nhân")
def update_profile(db: Session = Depends(deps.get_db)):
    return {"message": "Endpoint configured for U002 - Profile Update"}
