"""
Authentication & Profile Routing Handler.
Assigned Member: Trần Gia Hiển (U001, U002 - TC-001 to TC-006).
"""
from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.services.auth_service import AuthService
from app.core.security import create_access_token

router = APIRouter()

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="U001 - Đăng ký tài khoản mới"
)
def register(user_in: UserRegister, db: Session = Depends(deps.get_db)):
    db_user = AuthService.register(db, user_in)
    access_token = create_access_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="U001 - Đăng nhập tài khoản"
)
def login(login_in: UserLogin, db: Session = Depends(deps.get_db)):
    db_user = AuthService.login(db, login_in)
    access_token = create_access_token(subject=db_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post(
    "/password-reset/request",
    summary="U001 - Yêu cầu khôi phục mật khẩu qua OTP"
)
def reset_request(
    reset_in: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db)
):
    return AuthService.request_password_reset(db, reset_in.email, background_tasks)

@router.post(
    "/password-reset/confirm",
    summary="U001 - Xác thực OTP và cập nhật mật khẩu mới"
)
def reset_confirm(
    confirm_in: PasswordResetConfirm,
    db: Session = Depends(deps.get_db)
):
    return AuthService.confirm_password_reset(db, confirm_in)

@router.put("/profiles/me", summary="U002 - Cập nhật hồ sơ cá nhân")
def update_profile(db: Session = Depends(deps.get_db)):
    return {"message": "Endpoint configured for U002 - Profile Update"}
