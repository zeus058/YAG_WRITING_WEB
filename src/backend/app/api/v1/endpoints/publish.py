"""
U005 - Endpoint xuất bản chương truyện.
POST /api/v1/chapters/{chapter_id}/publish
"""
import asyncio
from functools import partial

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.services.publish_service import (
    PUBLISH_QUEUE_NAME,
    PublishTaskPayload,
    push_publish_task_to_queue,
    validate_chapter_for_publish,
)

router = APIRouter()


@router.post(
    "/chapters/{chapter_id}/publish",
    summary="U005 - Yêu cầu xuất bản chương truyện (Gửi async Task vào RabbitMQ)",
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_publish_chapter(
    chapter_id: str,
    db: Session = Depends(deps.get_db),
    # current_user = Depends(deps.get_current_user),  # Bật khi có auth
):
    """
    **U005 - Xuất bản chương truyện (Bất đồng bộ)**

    Flow:
    1. Validate chapter tồn tại và ở trạng thái `draft`
    2. Tạo task payload
    3. Đẩy vào RabbitMQ queue (chạy trong thread pool, không block event loop)
    4. Trả về **202 Accepted** ngay lập tức

    Worker sẽ xử lý: kiểm duyệt → cập nhật DB → gửi notification.
    """
    # Bước 1: Validate chapter
    try:
        validate_chapter_for_publish(chapter_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    # Bước 2: Tạo payload
    payload = PublishTaskPayload(
        chapter_id=chapter_id,
        requested_by="current_user_id",  # TODO: thay bằng current_user.id
    )

    # Bước 3: Gọi pika sync trong thread pool để không block FastAPI event loop
    loop = asyncio.get_event_loop()
    success = await loop.run_in_executor(
        None,
        partial(push_publish_task_to_queue, payload),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Không thể kết nối RabbitMQ tại {settings.RABBITMQ_HOST}. Thử lại sau.",
        )

    # Bước 4: 202 Accepted — không chờ worker xử lý xong
    return {
        "status": "accepted",
        "message": "Yêu cầu xuất bản đã được nhận và đang xử lý.",
        "chapter_id": chapter_id,
        "queue": PUBLISH_QUEUE_NAME,
        "queued_at": payload.requested_at,
    }