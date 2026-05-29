"""
Profile schemas — Hồ sơ người dùng.

Phục vụ Use Cases: U002 (Quản lý hồ sơ), Screens: S12, S13.
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class ProfileResponse(BaseModel):
    """Hồ sơ đầy đủ của người dùng (kết hợp users + profiles)."""

    user_id: uuid.UUID = Field(..., description="ID tài khoản")
    username: str = Field(..., description="Tên đăng nhập")
    display_name: str = Field(..., description="Bút danh hiển thị")
    avatar_url: Optional[str] = Field(default=None, description="URL ảnh đại diện (Cloudinary)")
    bio: Optional[str] = Field(default=None, description="Giới thiệu bản thân")
    reputation_score: int = Field(..., description="Điểm uy tín tác giả (0-100)")
    role: str = Field(..., description="Vai trò (admin / author / reader)")
    stories_count: Optional[int] = Field(default=0, description="Số tác phẩm đã viết")
    joined_at: Optional[datetime] = Field(default=None, description="Ngày tham gia")

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class ProfileUpdate(BaseModel):
    """Schema cập nhật hồ sơ (partial update)."""

    display_name: Optional[str] = Field(
        default=None, max_length=100, description="Bút danh mới"
    )
    bio: Optional[str] = Field(
        default=None, max_length=500, description="Giới thiệu bản thân (tối đa 500 ký tự)"
    )
