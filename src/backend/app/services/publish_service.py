"""
U005 - Publish Service: Xử lý logic xuất bản chương truyện.
Đẩy task bất đồng bộ vào RabbitMQ queue để worker xử lý.
"""
import json
import logging
from datetime import datetime
from typing import Optional

import pika
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

PUBLISH_QUEUE_NAME = "chapter_publish_queue"


# ──────────────────────────────────────────────
# Helper
# ──────────────────────────────────────────────

def get_rabbitmq_connection() -> pika.BlockingConnection:
    """Tạo kết nối đến RabbitMQ dùng credentials từ .env."""
    credentials = pika.PlainCredentials(
        username=settings.RABBITMQ_USER,
        password=settings.RABBITMQ_PASSWORD,
    )
    params = pika.ConnectionParameters(
        host=settings.RABBITMQ_HOST,
        port=settings.RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300,
    )
    return pika.BlockingConnection(params)


# ──────────────────────────────────────────────
# Schema / DTO
# ──────────────────────────────────────────────

class PublishTaskPayload:
    """Payload gửi vào RabbitMQ."""

    def __init__(self, chapter_id: str, requested_by: str, requested_at: Optional[str] = None):
        self.chapter_id = chapter_id
        self.requested_by = requested_by
        self.requested_at = requested_at or datetime.utcnow().isoformat()

    def to_dict(self) -> dict:
        return {
            "task_type": "publish_chapter",
            "chapter_id": self.chapter_id,
            "requested_by": self.requested_by,
            "requested_at": self.requested_at,
        }


# ──────────────────────────────────────────────
# RabbitMQ Publisher
# ──────────────────────────────────────────────

def push_publish_task_to_queue(payload: PublishTaskPayload) -> bool:
    """
    Kết nối RabbitMQ (pika sync) và đẩy task xuất bản vào queue.
    Gọi từ FastAPI endpoint qua run_in_executor để không block event loop.
    """
    connection = None
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()

        channel.queue_declare(queue=PUBLISH_QUEUE_NAME, durable=True)

        channel.basic_publish(
            exchange="",
            routing_key=PUBLISH_QUEUE_NAME,
            body=json.dumps(payload.to_dict()),
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent,
                content_type="application/json",
            ),
        )

        logger.info(f"[U005] Task đã đẩy vào queue: chapter_id={payload.chapter_id}")
        return True

    except pika.exceptions.AMQPConnectionError as e:
        logger.error(
            f"[U005] Không thể kết nối RabbitMQ "
            f"{settings.RABBITMQ_USER}@{settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}: {e}"
        )
        return False
    except Exception as e:
        logger.error(f"[U005] Lỗi khi đẩy task vào queue: {e}")
        return False
    finally:
        if connection and not connection.is_closed:
            connection.close()


# ──────────────────────────────────────────────
# Business Logic
# ──────────────────────────────────────────────

def validate_chapter_for_publish(chapter_id: str, db: Session) -> dict:
    """
    Kiểm tra chapter có đủ điều kiện xuất bản không.

    TODO: Thay bằng query thật khi có model Chapter:
        from app.models.chapter import Chapter
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ValueError(f"Chapter {chapter_id} không tồn tại")
        if chapter.status != "draft":
            raise ValueError(f"Chapter {chapter_id} không ở trạng thái draft")
        return chapter
    """
    return {
        "chapter_id": chapter_id,
        "status": "draft",
    }