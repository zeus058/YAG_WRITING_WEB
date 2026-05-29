"""
Common schemas — Các schema dùng chung cho toàn bộ API.

Quy ước response: { "success": true, "data": {...}, "message": "..." }
"""

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class StandardResponse(BaseModel):
    """Cấu trúc response chuẩn cho mọi API endpoint."""

    success: bool = Field(..., description="Trạng thái xử lý request")
    data: Optional[Any] = Field(default=None, description="Dữ liệu trả về")
    message: Optional[str] = Field(default=None, description="Thông báo kèm theo")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "success": True,
                    "data": {"id": "550e8400-e29b-41d4-a716-446655440000"},
                    "message": "Thao tác thành công",
                }
            ]
        }
    )


class ErrorDetail(BaseModel):
    """Chi tiết lỗi trả về cho client."""

    code: str = Field(..., description="Mã lỗi (VD: 'INVALID_CREDENTIALS', 'NOT_FOUND')")
    message: str = Field(..., description="Mô tả lỗi chi tiết")


class ErrorResponse(BaseModel):
    """Response khi xảy ra lỗi."""

    success: bool = Field(default=False, description="Luôn là False khi có lỗi")
    error: ErrorDetail = Field(..., description="Chi tiết lỗi")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Không tìm thấy tài nguyên yêu cầu",
                    },
                }
            ]
        }
    )


class PaginationParams(BaseModel):
    """Tham số phân trang cho các endpoint danh sách."""

    page: int = Field(default=1, ge=1, description="Số trang hiện tại (bắt đầu từ 1)")
    limit: int = Field(
        default=20, ge=1, le=50, description="Số lượng item mỗi trang (tối đa 50)"
    )
