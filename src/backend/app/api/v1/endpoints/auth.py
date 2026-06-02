"""
Authentication & Profile Routing Handler.
Assigned Member: Trần Gia Hiển (U001, U002 - TC-001 to TC-006).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.profile import Profile
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    ProfileUpdate,
    ProfileResponse,
)
from app.services.auth_service import AuthService
from app.services.cloudinary_service import CloudinaryService
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

# ========================================================
# U002 — Profile Endpoints
# ========================================================

@router.put(
    "/profiles/me",
    response_model=ProfileResponse,
    summary="U002 - Cập nhật hồ sơ cá nhân"
)
def update_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PROFILE_NOT_FOUND"
        )
        
    if profile_in.display_name is not None:
        profile.display_name = profile_in.display_name
    if profile_in.bio is not None:
        profile.bio = profile_in.bio
        
    try:
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cập nhật profile thất bại: {str(e)}"
        )

@router.post(
    "/profiles/avatar",
    response_model=ProfileResponse,
    summary="U002 - Tải ảnh đại diện mới lên Cloudinary"
)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # 1. Validate image format
    if file.content_type not in ["image/png", "image/jpeg", "image/webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="INVALID_IMAGE_FORMAT"
        )
        
    # 2. Validate file size (2MB max)
    try:
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)
    except Exception:
        # Fallback if tell is not supported by SpooledTemporaryFile
        file_size = len(file.file.read())
        file.file.seek(0)

    if file_size > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="IMAGE_TOO_LARGE"
        )

    # 3. Upload to Cloudinary
    avatar_url = CloudinaryService.upload_avatar(file)
    
    # 4. Update database
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(user_id=current_user.id, display_name=current_user.username)
        
    try:
        profile.avatar_url = avatar_url
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cập nhật ảnh đại diện thất bại: {str(e)}"
        )
