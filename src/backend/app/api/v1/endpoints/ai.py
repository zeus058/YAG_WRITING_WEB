"""
AI Smart Novel Engine — Simplified routing handler.
Removed legacy MCP manifest and tool listing endpoints.
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.schemas.ai import (
    AISuggestionRequest,
    AISuggestionResponse,
)
from app.services.ai_service import generate_ai_suggestions, stream_ai_suggestions

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
    _ = token_payload
    return await generate_ai_suggestions(payload, db=db)


@router.post(
    "/suggestions/stream",
    summary="U006 - AI Streaming: sinh chữ thời gian thực (SSE)",
)
async def ai_suggestions_stream(
    payload: AISuggestionRequest,
    db: Session = Depends(deps.get_db),
    token_payload=Depends(deps.require_author_role),
):
    _ = token_payload
    generator = stream_ai_suggestions(payload, db=db)
    return StreamingResponse(generator, media_type="text/event-stream")
