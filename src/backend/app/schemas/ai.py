"""
AI schemas for U008 semantic search.
"""
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
