import json
import logging
import sys
import time
import asyncio
from uuid import UUID

import pika

sys.path.append("/app")

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.chapter import Chapter
from app.models.story import Story
from app.services.moderation_service import (
    ModerationResult,
    apply_moderation_result,
    moderate_content,
)
from app.services.notification_service import create_notification
from app.services.publish_service import PUBLISH_QUEUE_NAME, get_rabbitmq_connection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("worker")

REQUEUE_DELAY_SECONDS = 60


class RetryableModerationError(Exception):
    pass


class PermanentWorkerError(Exception):
    pass


def declare_moderation_queues(channel) -> None:
    channel.queue_declare(queue=settings.RABBITMQ_MODERATION_DLQ, durable=True)
    channel.queue_declare(
        queue=settings.RABBITMQ_MODERATION_RETRY_QUEUE,
        durable=True,
        arguments={
            "x-message-ttl": REQUEUE_DELAY_SECONDS * 1000,
            "x-dead-letter-exchange": "",
            "x-dead-letter-routing-key": PUBLISH_QUEUE_NAME,
        },
    )
    channel.queue_declare(queue=PUBLISH_QUEUE_NAME, durable=True)


def _retry_count(properties) -> int:
    headers = getattr(properties, "headers", None) or {}
    try:
        return int(headers.get("x-retry-count", 0))
    except (TypeError, ValueError):
        return 0


def _publish_retry(channel, payload: dict, properties, reason: str) -> bool:
    retry_count = _retry_count(properties) + 1
    headers = dict(getattr(properties, "headers", None) or {})
    headers["x-retry-count"] = retry_count
    headers["x-last-error"] = reason[:500]

    target_queue = settings.RABBITMQ_MODERATION_RETRY_QUEUE
    if retry_count > settings.RABBITMQ_MODERATION_MAX_RETRIES:
        target_queue = settings.RABBITMQ_MODERATION_DLQ
        logger.error("Moving moderation task to DLQ after %s retries: %s", retry_count - 1, reason)
    else:
        logger.warning("Retrying moderation task in %ss (attempt %s/%s): %s", REQUEUE_DELAY_SECONDS, retry_count, settings.RABBITMQ_MODERATION_MAX_RETRIES, reason)

    channel.basic_publish(
        exchange="",
        routing_key=target_queue,
        body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        properties=pika.BasicProperties(
            delivery_mode=pika.DeliveryMode.Persistent,
            content_type="application/json",
            headers=headers,
        ),
    )
    return target_queue != settings.RABBITMQ_MODERATION_DLQ


def _load_chapter(db, chapter_id: str) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise PermanentWorkerError(f"Chapter {chapter_id} not found")
    return chapter


def _load_story_author_id(db, story_id) -> str | None:
    story = db.query(Story).filter(Story.id == story_id).first()
    return str(story.author_id) if story else None


def _build_notification(chapter: Chapter, report) -> dict:
    return {
        "type": "chapter_moderation_result",
        "chapter_id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "moderation_status": chapter.moderation_status,
        "is_violation": report.result in {ModerationResult.REJECTED, ModerationResult.FLAGGED},
        "confidence_score": report.confidence,
        "reason": report.reason,
        "flagged_categories": report.flagged_categories,
    }


def _sync_embedding_if_approved(db, chapter: Chapter, report) -> None:
    if report.result != ModerationResult.APPROVED or not settings.GEMINI_API_KEY:
        return

    story = db.query(Story).filter(Story.id == chapter.story_id).first()
    if not story:
        return

    try:
        from app.services.ai_service import sync_story_embedding

        asyncio.run(sync_story_embedding(db, story_id=str(story.id), description=story.description))
    except Exception as exc:
        logger.warning("Failed to sync embedding for story %s after moderation: %s", story.id, exc)


def handle_publish_chapter(payload: dict, db=None) -> None:
    chapter_id = payload.get("chapter_id")
    if not chapter_id:
        raise PermanentWorkerError("Missing chapter_id")

    owns_db = db is None
    db = db or SessionLocal()

    try:
        chapter = _load_chapter(db, chapter_id)
        content = (chapter.content or payload.get("content") or "").strip()
        if not content:
            raise PermanentWorkerError(f"Chapter {chapter_id} has empty content")

        logger.info("Moderating chapter %s", chapter_id)
        report = moderate_content(content=content, chapter_id=chapter_id)

        if report.result == ModerationResult.ERROR:
            raise RetryableModerationError(report.reason)

        chapter = apply_moderation_result(chapter_id=chapter_id, report=report, db=db)
        _sync_embedding_if_approved(db, chapter, report)

        author_id = payload.get("requested_by") or _load_story_author_id(db, chapter.story_id)
        if author_id:
            notification_payload = _build_notification(chapter, report)
            create_notification(
                db=db,
                user_id=UUID(str(author_id)),
                type="chapter_moderation_result",
                title="Ket qua kiem duyet chuong",
                message=f"Chuong '{chapter.title}' da duoc cap nhat trang thai: {chapter.moderation_status}.",
                payload=notification_payload,
            )

        logger.info(
            "Finished moderation for chapter %s with status=%s",
            chapter_id,
            chapter.moderation_status,
        )
    finally:
        if owns_db:
            db.close()


def on_message(channel, method, properties, body) -> None:
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON message: %s", exc)
        channel.basic_ack(delivery_tag=method.delivery_tag)
        return

    task_type = payload.get("task_type")
    try:
        if task_type == "publish_chapter":
            handle_publish_chapter(payload)
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        logger.warning("Unknown task type: %s", task_type)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except RetryableModerationError as exc:
        _publish_retry(channel, payload, properties, str(exc))
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except PermanentWorkerError as exc:
        logger.error("Permanent worker error, dropping message: %s", exc)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as exc:
        logger.error("Unexpected worker error: %s", exc)
        _publish_retry(channel, payload, properties, str(exc))
        channel.basic_ack(delivery_tag=method.delivery_tag)


def start_worker() -> None:
    while True:
        try:
            logger.info("Connecting RabbitMQ at %s", settings.RABBITMQ_HOST)
            connection = get_rabbitmq_connection()
            channel = connection.channel()
            declare_moderation_queues(channel)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=PUBLISH_QUEUE_NAME, on_message_callback=on_message)

            logger.info("Worker listening on queue '%s'", PUBLISH_QUEUE_NAME)
            channel.start_consuming()
        except pika.exceptions.AMQPConnectionError as exc:
            logger.error("RabbitMQ connection lost: %s. Retrying in 5 seconds.", exc)
            time.sleep(5)
        except KeyboardInterrupt:
            logger.info("Worker stopped.")
            break


if __name__ == "__main__":
    start_worker()
