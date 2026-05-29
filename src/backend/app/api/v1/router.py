"""
Main Router Hub for API v1.
Registers and exposes route handlers to the main FastAPI app.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, stories, chapters, payment, ai, admin

api_router = APIRouter()

# Register endpoints mapping to team members
api_router.include_router(auth.router, prefix="/auth", tags=["F1 - Authentication (Gia Hiển)"])
api_router.include_router(payment.router, prefix="/payment", tags=["F2 - VNPAY Payment (Duy Trường)"])
api_router.include_router(stories.router, prefix="/stories", tags=["F4 - Stories & Novel Management (Yến Nhi)"])
api_router.include_router(chapters.router, prefix="/chapters", tags=["F4 - Interactive WS Editor (Yến Nhi)"])
api_router.include_router(ai.router, prefix="/ai", tags=["F3 - AI Smart Novel Engine (Hương Trà)"])
api_router.include_router(admin.router, prefix="/admin", tags=["F5 - Async Moderation & Admin (Phú Thọ)"])

# Thêm 2 dòng này vào router.py
from app.api.v1.endpoints import publish
api_router.include_router(publish.router, tags=["Publishing"])