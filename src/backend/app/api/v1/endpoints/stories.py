"""
Stories & Novel Creation Routing Handler.
Assigned Member: Huynh Yen Nhi (U003 - TC-018).
"""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.ai import AISemanticSearchRequest, AISemanticSearchResponse
from app.services.ai_service import search_stories_semantic, sync_story_embedding

router = APIRouter()


class StoryEmbeddingSyncPayload(BaseModel):
    story_id: str | None = None
    description: str | None = Field(default=None, min_length=1)


@router.post("/", summary="U003 - Khoi tao bo truyen moi va tai bia truyen len Cloudinary")
async def create_story(
    payload: StoryEmbeddingSyncPayload | None = None,
    db: Session = Depends(deps.get_db),
):
    if payload and payload.story_id and payload.description:
        await sync_story_embedding(db, story_id=payload.story_id, description=payload.description)
    return {"message": "Story created successfully"}


@router.put("/{story_id}", summary="U003 - Cap nhat thong tin chung cua bo truyen")
async def update_story(
    story_id: str,
    payload: StoryEmbeddingSyncPayload | None = None,
    db: Session = Depends(deps.get_db),
):
    if payload and payload.description:
        await sync_story_embedding(
            db,
            story_id=payload.story_id or story_id,
            description=payload.description,
        )
    return {"message": f"Story {story_id} updated"}


@router.post(
    "/search",
    response_model=AISemanticSearchResponse,
    summary="U008 - Tim kiem cot truyen nguyen nghia bang ngon ngu tu nhien (pgvector)",
)
async def semantic_search(
    payload: AISemanticSearchRequest,
    db: Session = Depends(deps.get_db),
):
    return await search_stories_semantic(db, payload)
