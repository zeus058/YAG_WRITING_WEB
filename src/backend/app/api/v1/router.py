"""
Main Router Hub for API v1.
Registers and exposes route handlers to the main FastAPI app.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import ai

api_router = APIRouter()

api_router.include_router(ai.router, prefix="/ai", tags=["F3 - AI Smart Novel Engine (Hương Trà)"])
