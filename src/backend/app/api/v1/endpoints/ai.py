"""
AI Smart Novel Engine & pgvector Search Routing Handler.
Assigned Member: Pham Huong Tra (U006, U008, U009 - TC-013 to TC-015).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.ai.tools import build_mcp_manifest, list_tool_definitions
from app.schemas.ai import (
    AIMcpManifestResponse,
    AISuggestionRequest,
    AISuggestionResponse,
    AIToolDefinition,
)
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
    _ = token_payload
    return await generate_ai_suggestions(payload, db=db)


@router.get(
    "/tools",
    response_model=list[AIToolDefinition],
    summary="List authenticated YAG AI agent tools",
)
async def ai_tools(_token_payload=Depends(deps.require_authenticated_user)):
    return list_tool_definitions()


@router.get(
    "/mcp/manifest",
    response_model=AIMcpManifestResponse,
    summary="MCP-compatible YAG AI tools and skills manifest",
)
async def ai_mcp_manifest(_token_payload=Depends(deps.require_authenticated_user)):
    return build_mcp_manifest()
