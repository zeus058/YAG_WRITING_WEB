"""
Root-level personalized recommendations endpoint for U009.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.ai import AIRecommendationResponse
from app.services.ai_service import recommend_stories_for_user

router = APIRouter()


@router.get(
    "/",
    response_model=AIRecommendationResponse,
    summary="U009 - De xuat truyen ca nhan hoa theo so thich",
)
async def recommendations(
    db: Session = Depends(deps.get_db),
    token_payload=Depends(deps.require_authenticated_user),
):
    user_id = str(token_payload.get("sub", "anonymous"))
    return await recommend_stories_for_user(db, user_id)
