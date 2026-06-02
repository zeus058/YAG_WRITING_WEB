"""
Main Router Hub for API v1.
Registers and exposes route handlers to the main FastAPI app.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import recommendations

api_router = APIRouter()

api_router.include_router(recommendations.router, prefix="/recommendations", tags=["F3 - AI Smart Novel Engine (HÆ°Æ¡ng TrÃ )"])
