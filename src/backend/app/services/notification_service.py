import asyncio
import json
import logging
from typing import Any, Optional
from uuid import UUID
from datetime import datetime, timezone

import redis
from fastapi import WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import Notification
from app.models.story import Story
from app.models.chapter import Chapter
from app.models.library import Library

logger = logging.getLogger(__name__)

NOTIFICATION_CHANNEL_PREFIX = "yag.notifications"


def _channel_name(user_id: str) -> str:
    return f"{NOTIFICATION_CHANNEL_PREFIX}.{user_id}"


def get_redis_client() -> redis.Redis:
    if settings.REDIS_URL:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=2.0,
        )

    redis_kwargs = {
        "host": settings.REDIS_HOST,
        "port": settings.REDIS_PORT,
        "db": 0,
        "decode_responses": True,
        "socket_timeout": 2.0,
    }
    redis_password = getattr(settings, "REDIS_PASSWORD", None)
    if isinstance(redis_password, str) and redis_password:
        redis_kwargs["password"] = redis_password
    return redis.Redis(**redis_kwargs)


def publish_user_notification(user_id: str, payload: dict[str, Any]) -> bool:
    """Publish a user notification through Redis pub/sub for WebSocket delivery."""
    try:
        client = get_redis_client()
        client.publish(_channel_name(user_id), json.dumps(payload, ensure_ascii=False))
        return True
    except Exception as exc:
        logger.warning("Notification publish failed for user %s: %s", user_id, exc)
        return False


def _token_from_websocket(websocket: WebSocket) -> str | None:
    if settings.ALLOW_WEBSOCKET_QUERY_TOKEN:
        token = websocket.query_params.get("token") or websocket.query_params.get(
            "access_token"
        )
        if token:
            return token
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1]
    return websocket.cookies.get("access_token") or websocket.cookies.get("token")


def _is_authorized_notification_socket(websocket: WebSocket, user_id: str) -> bool:
    token = _token_from_websocket(websocket)
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return False
    return str(payload.get("sub")) == str(user_id)


async def stream_user_notifications(websocket: WebSocket, user_id: str) -> None:
    """Forward Redis pub/sub events to a WebSocket client."""
    if not _is_authorized_notification_socket(websocket, user_id):
        await websocket.close(code=1008)
        return

    await websocket.accept()
    pubsub = None

    try:
        pubsub = get_redis_client().pubsub()
        pubsub.subscribe(_channel_name(user_id))

        while True:
            message = await asyncio.to_thread(
                pubsub.get_message,
                ignore_subscribe_messages=True,
                timeout=1.0,
            )
            if message and message.get("data"):
                try:
                    await websocket.send_json(json.loads(message["data"]))
                except json.JSONDecodeError:
                    await websocket.send_text(str(message["data"]))

            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
            except asyncio.TimeoutError:
                continue

    except WebSocketDisconnect:
        return
    except Exception as exc:
        logger.warning("Notification websocket closed for user %s: %s", user_id, exc)
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        if pubsub is not None:
            try:
                pubsub.unsubscribe(_channel_name(user_id))
                pubsub.close()
            except Exception:
                pass


# ---------------------------------------------------------------------------
# Database Persistent Operations
# ---------------------------------------------------------------------------


def create_notification(
    db: Session,
    user_id: UUID,
    type: str,
    title: str,
    message: str,
    payload: Optional[dict[str, Any]] = None,
) -> Notification:
    """Creates a notification record in PostgreSQL and broadcasts it via Redis pub/sub."""
    db_notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        payload=payload,
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)

    # Prepare JSON payload for live websocket delivery
    live_payload = {
        "id": str(db_notification.id),
        "user_id": str(db_notification.user_id),
        "type": db_notification.type,
        "title": db_notification.title,
        "message": db_notification.message,
        "payload": db_notification.payload,
        "read_at": None,
        "created_at": (
            db_notification.created_at.isoformat()
            if db_notification.created_at
            else None
        ),
    }
    publish_user_notification(str(user_id), live_payload)
    return db_notification


def get_user_notifications(
    db: Session,
    user_id: UUID,
    limit: int = 50,
) -> list[Notification]:
    """Retrieves all notifications for a specific user, sorted by creation date."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def mark_notification_as_read(
    db: Session,
    notification_id: UUID,
    user_id: UUID,
) -> Optional[Notification]:
    """Marks a single notification as read by setting read_at to the current time."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notification and not notification.read_at:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_notifications_as_read(db: Session, user_id: UUID) -> int:
    """Marks all unread notifications as read for a specific user."""
    result = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read_at.is_(None))
        .update(
            {Notification.read_at: datetime.now(timezone.utc)},
            synchronize_session=False,
        )
    )
    db.commit()
    return result


def get_unread_count(db: Session, user_id: UUID) -> int:
    """Returns the count of unread notifications for a user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.read_at.is_(None))
        .count()
    )


def notify_chapter_moderation_result(db: Session, chapter: Chapter, previous_status: str, new_status: str):
    """Sends notification to author when chapter is approved/rejected and to readers when published."""
    if previous_status == new_status:
        return
        
    story = chapter.story
    if not story:
        story = db.query(Story).filter(Story.id == chapter.story_id).first()
        
    if not story:
        return
        
    author_id = story.author_id

    if new_status == "approved":
        # Notify author
        create_notification(
            db, 
            user_id=author_id, 
            type="chapter_approved", 
            title="Chương đã được duyệt", 
            message=f"Chương {chapter.chapter_number} của tác phẩm '{story.title}' đã được duyệt thành công.",
            payload={"chapter_id": str(chapter.id), "story_id": str(story.id)}
        )
        
        # Notify readers who bookmarked this story
        libraries = db.query(Library).filter(Library.story_id == story.id).all()
        for lib in libraries:
            if lib.user_id != author_id:
                create_notification(
                    db,
                    user_id=lib.user_id,
                    type="new_chapter",
                    title="Chương mới đã cập nhật",
                    message=f"Truyện '{story.title}' vừa có chương mới: Chương {chapter.chapter_number} - {chapter.title}.",
                    payload={"chapter_id": str(chapter.id), "story_id": str(story.id)}
                )

    elif new_status == "rejected" or new_status == "flagged":
        # Notify author
        create_notification(
            db, 
            user_id=author_id, 
            type="chapter_rejected", 
            title="Chương bị từ chối", 
            message=f"Chương {chapter.chapter_number} bị AI hệ thống cảnh báo/từ chối. Vui lòng đợi tối đa 1 ngày để Admin xem xét.",
            payload={"chapter_id": str(chapter.id), "story_id": str(story.id)}
        )
