from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from uuid import UUID
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr

class UserRegister(UserBase):
    password: str = Field(..., min_length=8)
    role: Optional[str] = "reader"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v not in ["reader", "author", "admin"]:
            raise ValueError("Role must be reader, author, or admin")
        return v

class UserResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    premium_until: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str  # Can be email or username
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        from_attributes = True

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8)
