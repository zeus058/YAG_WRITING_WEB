"""
AI schemas for U006, U008 and U009.
"""
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

AiMode = str


class AISuggestionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(
        validation_alias=AliasChoices("chapter_id", "chapterId"),
        min_length=1,
    )
    context: str = Field(min_length=1, description="Recent draft context for Gemini.")
    mode: AiMode = Field(default="kịch tính")


class AISuggestionItem(BaseModel):
    title: str
    content: str
    reason: str | None = None


class AISuggestionResponse(BaseModel):
    chapter_id: str
    mode: AiMode
    provider: str = "gemini"
    fallback: bool = False
    suggestions: list[AISuggestionItem]
    message: str | None = None
