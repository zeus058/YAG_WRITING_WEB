"""
U005 - Worker: Consumer xử lý task xuất bản chương từ RabbitMQ.
Sử dụng pika (sync) theo requirements.txt có sẵn.
Chạy độc lập: python -m app.worker.main
"""
import json
import logging
import sys
import time

import pika

sys.path.append("/app")

from app.core.config import settings
from app.services.publish_service import (
    PUBLISH_QUEUE_NAME,
    get_rabbitmq_connection,
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
    Xử lý task xuất bản chương truyện.

    Steps:
    1. Lấy chapter từ DB
    2. Kiểm duyệt nội dung
    3. Cập nhật status → 'published'
    4. Gửi notification đến người đọc theo dõi
    """
    chapter_id = payload.get("chapter_id")
    requested_by = payload.get("requested_by")

    logger.info(f"[Worker] Bắt đầu xử lý: chapter_id={chapter_id}, by={requested_by}")

    # TODO: Kết nối DB
    # from app.core.database import SessionLocal
    # db = SessionLocal()
    # try:
    #     chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()

    # Bước 1: Kiểm duyệt nội dung
    logger.info(f"[Worker] Đang kiểm duyệt nội dung chapter {chapter_id}...")
    time.sleep(0.5)  # Giả lập thời gian xử lý

    # Bước 2: Cập nhật trạng thái DB
    logger.info(f"[Worker] Cập nhật chapter {chapter_id} → published")
    # chapter.status = "published"
    # chapter.published_at = datetime.utcnow()
    # db.commit()

    # Bước 3: Gửi notification
    logger.info(f"[Worker] Gửi notification cho người theo dõi chapter {chapter_id}...")
    # send_notifications(chapter)

    logger.info(f"[Worker] ✅ Xuất bản thành công: chapter_id={chapter_id}")


# ──────────────────────────────────────────────
# Message Callback (pika style)
# ──────────────────────────────────────────────

def on_message(channel, method, properties, body):
    """
    Callback được gọi mỗi khi có message mới trong queue.
    pika gọi hàm này với 4 tham số cố định.
    """
    try:
        payload = json.loads(body.decode("utf-8"))
        task_type = payload.get("task_type")

        logger.info(f"[Worker] Nhận task: {task_type}")

        if task_type == "publish_chapter":
            handle_publish_chapter(payload)
            # ACK: báo RabbitMQ đã xử lý thành công, xóa message khỏi queue
            channel.basic_ack(delivery_tag=method.delivery_tag)
        else:
            logger.warning(f"[Worker] Task type không xác định: {task_type}")
            # ACK luôn để tránh loop vô hạn với message không hợp lệ
            channel.basic_ack(delivery_tag=method.delivery_tag)

    except json.JSONDecodeError as e:
        logger.error(f"[Worker] Message JSON không hợp lệ: {e}")
        # ACK để loại bỏ message lỗi, không requeue
        channel.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        logger.error(f"[Worker] Lỗi xử lý message: {e}")
        # NACK + requeue=True: đẩy lại queue để retry
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

            # Xử lý 1 message tại một thời điểm (fair dispatch)
            channel.basic_qos(prefetch_count=1)

            channel.queue_declare(queue=PUBLISH_QUEUE_NAME, durable=True)
            channel.basic_consume(queue=PUBLISH_QUEUE_NAME, on_message_callback=on_message)

            logger.info(f"[Worker] ✅ Sẵn sàng. Lắng nghe queue: '{PUBLISH_QUEUE_NAME}'")
            channel.start_consuming()  # Blocking loop

        except pika.exceptions.AMQPConnectionError as e:
            logger.error(f"[Worker] Mất kết nối RabbitMQ: {e}. Thử lại sau 5 giây...")
            time.sleep(5)  # Chờ rồi reconnect

        except KeyboardInterrupt:
            logger.info("[Worker] Dừng worker.")
            break


if __name__ == "__main__":
    start_worker()