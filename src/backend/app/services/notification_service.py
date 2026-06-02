import asyncio
import json
import logging
from typing import Any

import redis
from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import settings

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

    return redis.Redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=0,
        decode_responses=True,
        socket_timeout=2.0,
    )


def publish_user_notification(user_id: str, payload: dict[str, Any]) -> bool:
    """Publish a user notification through Redis pub/sub for WebSocket delivery."""
    try:
        client = get_redis_client()
        client.publish(_channel_name(user_id), json.dumps(payload, ensure_ascii=False))
        return True
    except Exception as exc:
        logger.warning("Notification publish failed for user %s: %s", user_id, exc)
        return False


async def stream_user_notifications(websocket: WebSocket, user_id: str) -> None:
    """Forward Redis pub/sub events to a WebSocket client."""
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
