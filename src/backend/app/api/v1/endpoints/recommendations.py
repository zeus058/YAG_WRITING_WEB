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
    current_user=Depends(deps.get_current_user_optional),
):
    user_id = "anonymous"
    if current_user:
        user_id = str(current_user.id)
    return await recommend_stories_for_user(db, user_id)
