"""
Worker: Consumer xử lý task từ RabbitMQ.
- U005: publish_chapter  → kiểm duyệt Gemini → cập nhật DB
- U013: moderate_chapter → kiểm duyệt thủ công từ Admin
Chạy độc lập: python -m app.worker.main
"""
import json
import logging
import sys
import time

import pika

sys.path.append("/app")

from app.core.config import settings
from app.services.publish_service import PUBLISH_QUEUE_NAME, get_rabbitmq_connection
from app.services.moderation_service import (
    ModerationResult,
    moderate_content,
    apply_moderation_result,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("worker")


# ──────────────────────────────────────────────
# Task Handlers
# ──────────────────────────────────────────────

def handle_publish_chapter(payload: dict) -> None:
    """
    U005 + U013: Xuất bản chương → Kiểm duyệt Gemini → Cập nhật DB.

    Flow:
    1. Lấy nội dung chapter từ DB
    2. Gọi Gemini kiểm duyệt (U013)
    3. Cập nhật status theo kết quả: published / flagged / draft
    """
    chapter_id = payload.get("chapter_id")
    requested_by = payload.get("requested_by")

    logger.info(f"[Worker] Bắt đầu xử lý: chapter_id={chapter_id}, by={requested_by}")

    # TODO: Lấy nội dung chapter từ DB
    # from app.core.database import SessionLocal
    # db = SessionLocal()
    # chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    # content = chapter.content
    db = None  # Placeholder
    content = f"Nội dung chapter {chapter_id}"  # Placeholder — thay bằng chapter.content

    # Bước 1: Kiểm duyệt nội dung bằng Gemini (U013)
    logger.info(f"[Worker] Bắt đầu kiểm duyệt Gemini cho chapter {chapter_id}...")
    report = moderate_content(content=content, chapter_id=chapter_id)

    # Bước 2: Cập nhật trạng thái DB theo kết quả
    apply_moderation_result(chapter_id=chapter_id, report=report, db=db)

    # Bước 3: Log kết quả cuối
    if report.result == ModerationResult.APPROVED:
        logger.info(f"[Worker] ✅ Chapter {chapter_id} đã xuất bản thành công")
    elif report.result == ModerationResult.FLAGGED:
        logger.warning(
            f"[Worker] ⚠️  Chapter {chapter_id} bị gắn cờ vi phạm: "
            f"{report.flagged_categories} — chờ admin duyệt"
        )
    else:
        logger.error(f"[Worker] ❌ Kiểm duyệt lỗi cho chapter {chapter_id}: {report.reason}")


# ──────────────────────────────────────────────
# Message Dispatcher
# ──────────────────────────────────────────────

def on_message(channel, method, properties, body) -> None:
    """
    Callback pika — nhận message từ queue và điều phối đến handler.
    """
    try:
        payload = json.loads(body.decode("utf-8"))
        task_type = payload.get("task_type")

        logger.info(f"[Worker] Nhận task: {task_type}")

        if task_type == "publish_chapter":
            handle_publish_chapter(payload)
            channel.basic_ack(delivery_tag=method.delivery_tag)

        else:
            logger.warning(f"[Worker] Task type không xác định: {task_type}")
            channel.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError as e:
        logger.error(f"[Worker] Message JSON không hợp lệ: {e}")
        # ACK để tránh loop vô hạn với message lỗi
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error(f"[Worker] Lỗi xử lý message: {e}")
        # NACK + requeue=True để retry
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=True)


# ──────────────────────────────────────────────
# Worker Entry Point
# ──────────────────────────────────────────────

def start_worker() -> None:
    """Khởi động worker với auto-reconnect."""
    while True:
        try:
            logger.info(f"[Worker] Đang kết nối RabbitMQ: {settings.RABBITMQ_HOST}")
            connection = get_rabbitmq_connection()
            channel = connection.channel()

            channel.basic_qos(prefetch_count=1)
            channel.queue_declare(queue=PUBLISH_QUEUE_NAME, durable=True)
            channel.basic_consume(queue=PUBLISH_QUEUE_NAME, on_message_callback=on_message)

            logger.info(f"[Worker] ✅ Sẵn sàng. Lắng nghe queue: '{PUBLISH_QUEUE_NAME}'")
            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            logger.error(f"[Worker] Mất kết nối RabbitMQ: {e}. Thử lại sau 5 giây...")
            time.sleep(5)

        except KeyboardInterrupt:
            logger.info("[Worker] Dừng worker.")
            break


if __name__ == "__main__":
    start_worker()