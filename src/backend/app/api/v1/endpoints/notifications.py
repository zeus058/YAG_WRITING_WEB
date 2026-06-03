from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.api import deps
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
)
from app.services import notification_service

router = APIRouter()


@router.get("/", response_model=NotificationListResponse, summary="Lấy danh sách thông báo")
def list_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    limit: int = 50,
):
    notifications = notification_service.get_user_notifications(db, current_user.id, limit=limit)
    return NotificationListResponse(notifications=notifications)


@router.post("/{notification_id}/read", response_model=NotificationResponse, summary="Đánh dấu thông báo đã đọc")
def read_notification(
    notification_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    notification = notification_service.mark_notification_as_read(db, notification_id, current_user.id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo hoặc thông báo không thuộc người dùng này",
        )
    return notification


@router.post("/read-all", summary="Đánh dấu tất cả thông báo đã đọc")
def read_all_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    count = notification_service.mark_all_notifications_as_read(db, current_user.id)
    return {"status": "success", "marked_read_count": count}


@router.get("/unread-count", response_model=UnreadCountResponse, summary="Lấy số lượng thông báo chưa đọc")
def get_unread_notification_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    count = notification_service.get_unread_count(db, current_user.id)
    return UnreadCountResponse(unread_count=count)
