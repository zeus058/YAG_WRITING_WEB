"""
AI schemas — Gợi ý tình tiết & đề xuất truyện cá nhân hóa.

Phục vụ Use Cases: U006 (Gợi ý tình tiết AI), U009 (Đề xuất truyện).
Screen: S16 (Author Studio — AI Sidebar), S04 (Home Feed).
"""

import uuid
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.story import StoryListItem


# ---------------------------------------------------------------------------
# AI Suggest (U006)
# ---------------------------------------------------------------------------


class AISuggestRequest(BaseModel):
    """Request gợi ý tình tiết từ AI Sidebar."""

    chapter_id: uuid.UUID = Field(..., description="ID chương đang soạn thảo")
    context: str = Field(
        ...,
        max_length=5000,
        description="Đoạn văn bản ngữ cảnh (context ≤ 1000 từ, tối đa 5000 ký tự)",
    )
    genre: Optional[str] = Field(
        default=None, description="Thể loại để AI điều chỉnh phong cách gợi ý"
    )


class SuggestionItem(BaseModel):
    """Một gợi ý tình tiết từ AI."""

    index: int = Field(..., description="Thứ tự gợi ý (1, 2, 3)")
    text: str = Field(..., description="Nội dung gợi ý")
    style: str = Field(
        ..., description="Phong cách gợi ý (VD: 'dramatic', 'romantic', 'mystery')"
    )


class AISuggestResponse(BaseModel):
    """Response chứa danh sách gợi ý tình tiết."""

    suggestions: List[SuggestionItem] = Field(
        ..., description="Danh sách gợi ý (mặc định 3 gợi ý)"
    )
    context_words_used: int = Field(
        ..., description="Số từ context đã sử dụng để tạo gợi ý"
    )


# ---------------------------------------------------------------------------
# AI Recommend (U009)
# ---------------------------------------------------------------------------


class AIRecommendRequest(BaseModel):
    """Request đề xuất truyện cá nhân hóa."""

    limit: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Số truyện đề xuất tối đa",
    )


class AIRecommendResponse(BaseModel):
    """Response chứa danh sách truyện được AI đề xuất."""

    items: List[StoryListItem] = Field(
        ..., description="Danh sách truyện đề xuất"
    )
    total: int = Field(..., description="Tổng số truyện đề xuất")
