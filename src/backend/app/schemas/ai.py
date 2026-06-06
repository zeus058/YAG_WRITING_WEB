"""
AI schemas — Gợi ý tình tiết & đề xuất truyện cá nhân hóa.

Phục vụ Use Cases: U006 (Gợi ý tình tiết AI), U008 (AI Tìm kiếm ngữ nghĩa), U009 (Đề xuất truyện).
"""

import uuid
from typing import List, Optional
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator
from app.schemas.story import StoryListItem

AiMode = str

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

    @field_validator("context")
    @classmethod
    def validate_context_limit(cls, v: str) -> str:
        if len(v.split()) > 1000:
            raise ValueError("Context length cannot exceed 1000 words")
        return v


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


# U006 actual endpoints schemas
class AISuggestionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(
        validation_alias=AliasChoices("chapter_id", "chapterId"),
        min_length=1,
    )
    story_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("story_id", "storyId"),
    )
    context: str = Field(min_length=1, description="Recent draft context for Gemini.")
    mode: AiMode = Field(default="plot")
    target_words: int | None = Field(
        default=None,
        validation_alias=AliasChoices("target_words", "targetWords"),
        ge=50,
        le=1200,
    )
    selected_text: str | None = Field(
        default=None,
        validation_alias=AliasChoices("selected_text", "selectedText"),
        max_length=5000,
    )
    style_reference_story_title: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "style_reference_story_title",
            "styleReferenceStoryTitle",
        ),
        max_length=255,
    )
    style_reference_series_title: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "style_reference_series_title",
            "styleReferenceSeriesTitle",
        ),
        max_length=255,
    )
    style_reference_author: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "style_reference_author",
            "styleReferenceAuthor",
        ),
        max_length=255,
    )

    @field_validator("context")
    @classmethod
    def validate_context_limit(cls, v: str) -> str:
        if len(v.split()) > 1000:
            raise ValueError("Context length cannot exceed 1000 words")
        return v


class AISuggestionItem(BaseModel):
    title: str
    content: str
    reason: str | None = None
    insertable_text: str | None = None
    quality_score: float | None = Field(default=None, ge=0.0, le=1.0)


class AISuggestionResponse(BaseModel):
    chapter_id: str
    mode: AiMode
    provider: str = "gemini"
    model: str | None = None
    fallback: bool = False
    suggestions: list[AISuggestionItem]
    message: str | None = None


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

    items: List[StoryListItem] = Field(..., description="Danh sách truyện đề xuất")
    total: int = Field(..., description="Tổng số truyện đề xuất")


# ---------------------------------------------------------------------------
# AI Semantic Search (U008)
# ---------------------------------------------------------------------------


class AISemanticSearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(
        validation_alias=AliasChoices("query", "q"),
        min_length=1,
        description="Natural language search query from reader.",
    )
    limit: int = Field(default=10, ge=1, le=20)


class AISemanticSearchItem(BaseModel):
    story_id: str
    title: str | None = None
    plot_summary: str
    distance: float
    similarity: float


class AISemanticSearchResponse(BaseModel):
    query: str
    provider: str = "gemini"
    fallback: bool = False
    results: list[AISemanticSearchItem]
    message: str | None = None


class AIRecommendationItem(BaseModel):
    story_id: str
    title: str | None = None
    plot_summary: str
    distance: float
    similarity: float
    reason: str | None = None
    match_tags: list[str] = Field(default_factory=list)
    source: str | None = None


class AIRecommendationResponse(BaseModel):
    user_id: str
    provider: str = "gemini"
    model: str | None = None
    fallback: bool = False
    recommendations: list[AIRecommendationItem]
    message: str | None = None


class AIToolDefinition(BaseModel):
    name: str
    description: str
    allowed_roles: list[str]
    input_schema: dict
    output_schema: dict


class AISkillDefinition(BaseModel):
    name: str
    description: str
    prompt: str


class AIMcpManifestResponse(BaseModel):
    name: str
    version: str
    description: str
    provider: str
    model_routing: dict | None = None
    tools: list[AIToolDefinition]
    skills: list[AISkillDefinition]
    execution: dict
