from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator
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
        if v not in ["reader", "author"]:
            raise ValueError("Role must be reader or author")
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
    accessToken: Optional[str] = None
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        from_attributes = True


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(
        ...,
        validation_alias=AliasChoices("new_password", "password"),
        min_length=8,
    )

    model_config = ConfigDict(populate_by_name=True)

# ==========================================
# U002 — Profile Management Schemas
# ==========================================


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)


class ProfileResponse(BaseModel):
    user_id: UUID
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    reputation_score: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CurrentUserProfile(BaseModel):
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    reputation_score: int = 100

    class Config:
        from_attributes = True


class CurrentUserResponse(UserResponse):
    profile: Optional[CurrentUserProfile] = None
