"""
Main Router Hub for API v1.
Registers and exposes route handlers to the main FastAPI app.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import stories

api_router = APIRouter()

api_router.include_router(stories.router, prefix="/stories", tags=["F4 - Stories & Novel Management (Yáº¿n Nhi)"])
