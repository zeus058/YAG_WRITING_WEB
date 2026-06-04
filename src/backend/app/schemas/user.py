"""
User schemas — Xác thực, phân quyền, quản lý tài khoản.

Phục vụ Use Cases: U001 (Đăng ký / Đăng nhập).
"""

import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    """Schema đăng ký tài khoản mới."""

    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-z0-9_]+$",
        description="Tên đăng nhập (chỉ chứa chữ thường, số, gạch dưới)",
    )
    email: EmailStr = Field(..., description="Địa chỉ email")
    password: str = Field(
        ..., min_length=8, description="Mật khẩu (tối thiểu 8 ký tự)"
    )
    role: Optional[Literal["reader", "author"]] = Field(
        default="reader", description="Vai trò tài khoản"
    )


class UserLogin(BaseModel):
    """Schema đăng nhập."""

    email: EmailStr = Field(..., description="Email đã đăng ký")
    password: str = Field(..., description="Mật khẩu")


class PasswordReset(BaseModel):
    """Schema yêu cầu đặt lại mật khẩu (gửi OTP qua email)."""

    email: EmailStr = Field(..., description="Email tài khoản cần khôi phục")


class PasswordResetConfirm(BaseModel):
    """Schema xác nhận đặt lại mật khẩu bằng OTP."""

    email: EmailStr = Field(..., description="Email tài khoản")
    otp: str = Field(
        ..., min_length=6, max_length=6, description="Mã OTP 6 ký tự"
    )
    new_password: str = Field(
        ..., min_length=8, description="Mật khẩu mới (tối thiểu 8 ký tự)"
    )


class PasswordChange(BaseModel):
    """Schema đổi mật khẩu (khi đã đăng nhập)."""

    current_password: str = Field(..., description="Mật khẩu hiện tại")
    new_password: str = Field(
        ..., min_length=8, description="Mật khẩu mới (tối thiểu 8 ký tự)"
    )


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class UserResponse(BaseModel):
    """Thông tin tài khoản trả về cho client."""

    user_id: uuid.UUID = Field(..., alias="id", description="ID tài khoản")
    username: str = Field(..., description="Tên đăng nhập")
    email: str = Field(..., description="Email")
    role: str = Field(..., description="Vai trò (admin / author / reader)")
    premium_until: Optional[datetime] = Field(
        default=None, description="Hạn Membership (null = chưa đăng ký)"
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserInToken(BaseModel):
    """Thông tin user nhúng bên trong JWT token response."""

    user_id: uuid.UUID = Field(..., description="ID tài khoản")
    username: str = Field(..., description="Tên đăng nhập")
    role: str = Field(..., description="Vai trò")
    premium_until: Optional[datetime] = Field(
        default=None, description="Hạn Membership"
    )


class TokenResponse(BaseModel):
    """Response sau khi đăng nhập thành công, trả JWT token."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Loại token")
    expires_in: int = Field(..., description="Thời gian hết hạn (giây)")
    user: UserInToken = Field(..., description="Thông tin user")
