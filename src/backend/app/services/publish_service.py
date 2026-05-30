import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

import pika
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chapter import Chapter
from app.models.story import Story
from app.models.user import User

logger = logging.getLogger(__name__)

PUBLISH_QUEUE_NAME = "yag_moderation_queue"


@dataclass
class PublishTaskPayload:
    chapter_id: str
    story_id: str
    content: str
    requested_by: str
    publish_at: Optional[str] = None
    is_premium: bool = False
    requested_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return {
            "task_type": "publish_chapter",
            "chapter_id": self.chapter_id,
            "story_id": self.story_id,
            "content": self.content,
            "requested_by": self.requested_by,
            "publish_at": self.publish_at,
            "is_premium": self.is_premium,
            "requested_at": self.requested_at,
        }


@dataclass
class PreparedPublish:
    payload: PublishTaskPayload
    previous_status: str
    previous_is_premium: bool
    previous_publish_at: Optional[datetime]


def get_rabbitmq_connection() -> pika.BlockingConnection:
    if settings.RABBITMQ_URL:
        return pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))

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


def push_publish_task_to_queue(payload: PublishTaskPayload) -> bool:
    """Publish the moderation task to RabbitMQ without blocking FastAPI directly."""
    connection = None
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()
        channel.queue_declare(queue=PUBLISH_QUEUE_NAME, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=PUBLISH_QUEUE_NAME,
            body=json.dumps(payload.to_dict(), ensure_ascii=False).encode("utf-8"),
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent,
                content_type="application/json",
            ),
        )
        logger.info("Queued moderation task for chapter %s", payload.chapter_id)
        return True
    except pika.exceptions.AMQPConnectionError as exc:
        logger.error(
            "RabbitMQ connection failed at %s:%s: %s",
            settings.RABBITMQ_HOST,
            settings.RABBITMQ_PORT,
            exc,
        )
        return False
    except Exception as exc:
        logger.error("Failed to publish moderation task: %s", exc)
        return False
    finally:
        if connection and not connection.is_closed:
            connection.close()


def _load_chapter_and_story(chapter_id: str, db: Session) -> tuple[Chapter, Story]:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise LookupError(f"Chapter {chapter_id} not found")

    story = db.query(Story).filter(Story.id == chapter.story_id).first()
    if not story:
        raise LookupError(f"Story for chapter {chapter_id} not found")

    return chapter, story


def _authorize_publish_owner(story: Story, current_user: User) -> None:
    if current_user.role not in {"author", "admin"}:
        raise PermissionError("Only authors can publish chapters")

    if current_user.role != "admin" and str(story.author_id) != str(current_user.id):
        raise PermissionError("You do not own this chapter")


def validate_chapter_for_publish(
    chapter_id: str,
    db: Session,
    current_user: Optional[User] = None,
) -> dict:
    chapter, story = _load_chapter_and_story(chapter_id, db)
    if current_user is not None:
        _authorize_publish_owner(story, current_user)

    content = (chapter.content or "").strip()
    if not content:
        raise ValueError("Chapter content is empty")

    if chapter.moderation_status == "pending":
        raise ValueError("Chapter is already pending moderation")

    return {
        "chapter_id": str(chapter.id),
        "story_id": str(story.id),
        "author_id": str(story.author_id),
        "moderation_status": chapter.moderation_status,
    }


def prepare_chapter_for_publish(
    chapter_id: str,
    db: Session,
    current_user: User,
    publish_at: Optional[datetime] = None,
    is_premium: bool = False,
) -> PreparedPublish:
    chapter, story = _load_chapter_and_story(chapter_id, db)
    _authorize_publish_owner(story, current_user)

    content = (chapter.content or "").strip()
    if not content:
        raise ValueError("Chapter content is empty")
    if chapter.moderation_status == "pending":
        raise ValueError("Chapter is already pending moderation")

    previous_status = chapter.moderation_status
    previous_is_premium = chapter.is_premium
    previous_publish_at = chapter.publish_at
    chapter.moderation_status = "pending"
    chapter.is_premium = is_premium
    chapter.publish_at = publish_at or datetime.now(timezone.utc)

    db.add(chapter)
    db.commit()
    db.refresh(chapter)

    payload = PublishTaskPayload(
        chapter_id=str(chapter.id),
        story_id=str(story.id),
        content=content,
        requested_by=str(current_user.id),
        publish_at=chapter.publish_at.isoformat() if chapter.publish_at else None,
        is_premium=chapter.is_premium,
    )
    return PreparedPublish(
        payload=payload,
        previous_status=previous_status,
        previous_is_premium=previous_is_premium,
        previous_publish_at=previous_publish_at,
    )


def restore_chapter_publish_state(
    chapter_id: str,
    db: Session,
    previous_status: str,
    previous_is_premium: Optional[bool] = None,
    previous_publish_at: Optional[datetime] = None,
) -> None:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        return
    chapter.moderation_status = previous_status
    if previous_is_premium is not None:
        chapter.is_premium = previous_is_premium
    chapter.publish_at = previous_publish_at
    db.add(chapter)
    db.commit()
