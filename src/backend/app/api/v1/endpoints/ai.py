"""
AI Smart Novel Engine & pgvector Search Routing Handler.
Assigned Member: Phạm Hương Trà (U006, U008, U009 - TC-013 to TC-015).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps

router = APIRouter()

@router.post("/suggestions", summary="U006 - Miu AI Sidebar: gợi ý 3 phương án phát triển tình tiết")
def ai_suggestions(db: Session = Depends(deps.get_db)):
    return {"message": "Gemini AI plot suggestions generated"}

@router.post("/search", summary="U008 - Tìm kiếm cốt truyện ngữ nghĩa bằng ngôn ngữ tự nhiên (pgvector)")
def semantic_search(db: Session = Depends(deps.get_db)):
    return {"message": "Cosine distance similarity matches retrieved"}

@router.get("/recommendations", summary="U009 - AI Đề xuất truyện cá nhân hóa theo sở thích")
def ai_recommendations(db: Session = Depends(deps.get_db)):
    return {"message": "Top 5 recommended novels generated"}
