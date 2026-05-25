"""
System Administration & Content Moderation Routing Handler.
Assigned Member: Nguyễn Phú Thọ (U005, U013, U014, U015 - TC-025 to TC-028).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps

router = APIRouter()

@router.post("/chapters/{chapter_id}/publish", summary="U005 - Yêu cầu xuất bản chương truyện (Gửi async Task vào RabbitMQ)")
def request_publish(chapter_id: str, db: Session = Depends(deps.get_db)):
    return {"message": "Publish request accepted (AMQP Task pushed to RabbitMQ)"}

@router.get("/moderation/queue", summary="U020 - Bảng hàng đợi duyệt cờ Admin")
def get_moderation_queue(db: Session = Depends(deps.get_db)):
    return {"message": "Flagged chapters retrieved for manual review"}

@router.get("/dashboard/stats", summary="U015 - Trang tổng quan báo cáo quản trị viên (Admin Dashboard)")
def get_stats(db: Session = Depends(deps.get_db)):
    return {"message": "Financial statements and usage growth stats generated"}
