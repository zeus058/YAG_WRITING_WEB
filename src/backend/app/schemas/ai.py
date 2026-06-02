"""
AI schemas for U009 recommendations.
"""
from pydantic import BaseModel


class AIRecommendationItem(BaseModel):
    story_id: str
    title: str | None = None
    plot_summary: str
    distance: float
    similarity: float


class AIRecommendationResponse(BaseModel):
    user_id: str
    provider: str = "gemini"
    fallback: bool = False
    recommendations: list[AIRecommendationItem]
    message: str | None = None
