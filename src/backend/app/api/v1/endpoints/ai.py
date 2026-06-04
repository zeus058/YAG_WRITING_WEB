"""
AI Smart Novel Engine & pgvector Search Routing Handler.
Assigned Member: Pham Huong Tra (U006, U008, U009 - TC-013 to TC-015).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.ai import AISuggestionRequest, AISuggestionResponse
from app.services.ai_service import generate_ai_suggestions

router = APIRouter()


@router.post(
    "/suggestions",
    response_model=AISuggestionResponse,
    summary="U006 - Miu AI Sidebar: goi y 3 phuong an phat trien tinh tiet",
)
async def ai_suggestions(
    payload: AISuggestionRequest,
    db: Session = Depends(deps.get_db),
    token_payload=Depends(deps.require_author_role),
):
    _ = db
    _ = token_payload
    return await generate_ai_suggestions(payload)
