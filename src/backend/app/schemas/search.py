"""
Search schemas — Tìm kiếm từ khóa & AI semantic search.

Phục vụ Use Cases: U008 (Tìm kiếm thông minh AI).
Screen: S05 (Khám phá & Tìm kiếm).
"""

import uuid
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Keyword search
# ---------------------------------------------------------------------------


class SearchResultItem(BaseModel):
    """Một kết quả tìm kiếm theo từ khóa."""

    id: uuid.UUID = Field(..., description="ID tác phẩm")
    title: str = Field(..., description="Tiêu đề")
    author_name: str = Field(..., description="Bút danh tác giả")
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa")
    category: str = Field(..., description="Thể loại")
    rating_avg: float = Field(..., description="Điểm đánh giá trung bình")


class SearchResponse(BaseModel):
    """Response cho tìm kiếm từ khóa."""

    items: List[SearchResultItem] = Field(..., description="Danh sách kết quả")
    total: int = Field(..., description="Tổng số kết quả")
    query: str = Field(..., description="Từ khóa đã tìm kiếm")


# ---------------------------------------------------------------------------
# AI Semantic search (pgvector)
# ---------------------------------------------------------------------------


class SemanticSearchRequest(BaseModel):
    """Request tìm kiếm ngữ nghĩa bằng AI (Gemini Embeddings + pgvector)."""

    query: str = Field(
        ...,
        min_length=2,
        max_length=500,
        description="Mô tả truyện bằng ngôn ngữ tự nhiên (VD: 'nam chính là hacker')",
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=50,
        description="Số kết quả tối đa trả về",
    )


class SemanticSearchResultItem(BaseModel):
    """Một kết quả semantic search kèm similarity score."""

    id: uuid.UUID = Field(..., description="ID tác phẩm")
    title: str = Field(..., description="Tiêu đề")
    author_name: str = Field(..., description="Bút danh tác giả")
    cover_url: Optional[str] = Field(default=None, description="URL ảnh bìa")
    similarity_score: float = Field(
        ..., description="Điểm tương đồng cosine (0.0-1.0)"
    )
    plot_summary: str = Field(..., description="Tóm tắt cốt truyện đã vector hóa")


class SemanticSearchResponse(BaseModel):
    """Response cho tìm kiếm ngữ nghĩa AI."""

    items: List[SemanticSearchResultItem] = Field(..., description="Danh sách kết quả")
    total: int = Field(..., description="Tổng số kết quả")
    query: str = Field(..., description="Mô tả gốc từ người dùng")
    search_mode: str = Field(
        default="semantic", description="Chế độ tìm kiếm (semantic / fallback_fulltext)"
    )
