"""
Interactive Chapter Reading & WebSocket Editor Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U004, U007, U010 - TC-016, TC-017, TC-019, TC-020).
"""
from datetime import datetime
import json
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
import redis
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState

from app.api import deps
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.story import Chapter, ReadingHistory, Story
from app.schemas.story import ChapterCreate, ChapterReadResponse, ChapterResponse, ChapterUpdate

router = APIRouter()
author_router = APIRouter()
CHAPTER_CACHE_TTL_SECONDS = 7200


class AutosaveMessage(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content: str | None = None

    model_config = ConfigDict(extra="ignore")

    @model_validator(mode="after")
    def require_draft_field(self):
        if self.title is None and self.content is None:
            raise ValueError("Autosave payload must include title or content")
        return self


def get_story_or_404(db: Session, story_id: UUID) -> Story:
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


def ensure_author_owns_story(story: Story, current_author) -> None:
    if story.author_id != current_author.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this story")


def get_author_chapter_or_404(db: Session, chapter_id: UUID, current_author) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    ensure_author_owns_story(chapter.story, current_author)
    return chapter


def apply_chapter_update(chapter: Chapter, update: ChapterUpdate) -> None:
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(chapter, key, value)
    # The current schema models draft chapters as pending moderation until publish.
    chapter.moderation_status = "pending"
    chapter.updated_at = datetime.utcnow()


def normalize_autosave_payload(payload: dict[str, Any]) -> AutosaveMessage:
    if payload.get("type") == "draft.patch" and isinstance(payload.get("payload"), dict):
        payload = payload["payload"]
    return AutosaveMessage.model_validate(payload)


def autosave_update_from_message(message: AutosaveMessage) -> ChapterUpdate:
    return ChapterUpdate(**message.model_dump(exclude_none=True))


def get_websocket_author(websocket: WebSocket):
    """
    Isolated until full JWT WebSocket auth is wired.
    Mirrors the REST author dependency so U004 can enforce ownership consistently.
    """
    current_author = deps.get_current_author()
    if getattr(current_author, "role", None) != "author":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only authors can autosave drafts")
    return current_author


def get_current_user():
    """
    Temporary reader dependency until JWT user resolution is shared across modules.
    Reuses the project mock user so Swagger can exercise U007 endpoints locally.
    """
    return deps.get_current_author()


def get_redis_client():
    redis_url = settings.REDIS_URL or f"redis://{settings.REDIS_HOST}:6379/0"
    return redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)


def chapter_cache_key(chapter_id: UUID) -> str:
    return f"chapter:content:{chapter_id}"


def story_views_key(story_id: UUID | str) -> str:
    return f"story:views:{story_id}"


def serialize_chapter(chapter: Chapter) -> dict[str, Any]:
    return {
        "id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "story_author_id": str(chapter.story.author_id),
        "chapter_number": chapter.chapter_number,
        "title": chapter.title,
        "content": chapter.content,
        "moderation_status": chapter.moderation_status,
        "is_premium": chapter.is_premium,
        "publish_at": chapter.publish_at.isoformat(),
    }


def can_read_chapter(chapter_data: dict[str, Any], current_user) -> bool:
    if not chapter_data["is_premium"]:
        return True
    if getattr(current_user, "role", None) == "admin":
        return True
    if str(getattr(current_user, "id", "")) == str(chapter_data["story_author_id"]):
        return True
    premium_until = getattr(current_user, "premium_until", None)
    return bool(premium_until and premium_until > datetime.utcnow())


def ensure_reader_can_read(chapter_data: dict[str, Any], current_user) -> None:
    if not can_read_chapter(chapter_data, current_user):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Premium membership is required to read this chapter",
        )


def ensure_chapter_is_available(chapter_data: dict[str, Any], current_user) -> None:
    is_author = str(getattr(current_user, "id", "")) == str(chapter_data["story_author_id"])
    if chapter_data["moderation_status"] != "approved" and not is_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chapter is not available")

    publish_at = datetime.fromisoformat(chapter_data["publish_at"])
    if publish_at > datetime.utcnow() and not is_author:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chapter is not published yet")


def update_reading_history(db: Session, user_id: UUID, chapter_id: UUID) -> None:
    history = (
        db.query(ReadingHistory)
        .filter(ReadingHistory.user_id == user_id, ReadingHistory.chapter_id == chapter_id)
        .first()
    )
    if history:
        history.read_at = datetime.utcnow()
    else:
        db.add(ReadingHistory(user_id=user_id, chapter_id=chapter_id))


def increment_story_view(redis_client, story_id: UUID | str) -> bool:
    if not redis_client:
        return False
    try:
        redis_client.incr(story_views_key(story_id))
        return True
    except redis.RedisError:
        return False


def get_cached_chapter(redis_client, chapter_id: UUID) -> dict[str, Any] | None:
    if not redis_client:
        return None
    try:
        cached = redis_client.get(chapter_cache_key(chapter_id))
    except redis.RedisError:
        return None
    if not cached:
        return None
    try:
        return json.loads(cached)
    except json.JSONDecodeError:
        return None


def cache_chapter(redis_client, chapter_data: dict[str, Any]) -> None:
    if not redis_client:
        return
    try:
        redis_client.setex(
            chapter_cache_key(UUID(chapter_data["id"])),
            CHAPTER_CACHE_TTL_SECONDS,
            json.dumps(chapter_data),
        )
    except redis.RedisError:
        return


def flush_story_view_counts(db: Session, redis_client) -> int:
    if not redis_client:
        return 0

    flushed_total = 0
    try:
        keys = list(redis_client.scan_iter(match="story:views:*"))
    except redis.RedisError:
        return 0

    for key in keys:
        try:
            increment = int(redis_client.get(key) or 0)
        except (redis.RedisError, ValueError):
            continue
        if increment <= 0:
            continue

        story_id = key.removeprefix("story:views:")
        story = db.query(Story).filter(Story.id == story_id).first()
        if not story:
            continue
        story.view_count = (story.view_count or 0) + increment
        redis_client.delete(key)
        flushed_total += increment

    db.commit()
    return flushed_total


@router.post("/", response_model=ChapterResponse, summary="U004 - Tạo chương mới dạng bản nháp")
def create_chapter(
    chapter_in: ChapterCreate,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author),
):
    story = get_story_or_404(db, chapter_in.story_id)
    ensure_author_owns_story(story, current_author)

    existing_chapter = (
        db.query(Chapter)
        .filter(
            Chapter.story_id == chapter_in.story_id,
            Chapter.chapter_number == chapter_in.chapter_number,
        )
        .first()
    )
    if existing_chapter:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chapter number already exists")

    chapter = Chapter(
        story_id=chapter_in.story_id,
        chapter_number=chapter_in.chapter_number,
        title=chapter_in.title,
        content=chapter_in.content,
        is_premium=chapter_in.is_premium or False,
        moderation_status="pending",
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.put("/{chapter_id}", response_model=ChapterResponse, summary="U004 - Lưu nháp chương")
def update_chapter(
    chapter_id: UUID,
    chapter_in: ChapterUpdate,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author),
):
    chapter = get_author_chapter_or_404(db, chapter_id, current_author)
    apply_chapter_update(chapter, chapter_in)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.post("/views/flush", summary="U007 - Flush Redis view counters về PostgreSQL")
def flush_views(db: Session = Depends(deps.get_db)):
    flushed_total = flush_story_view_counts(db, get_redis_client())
    return {
        "message": "View counters flushed",
        "flushed_total": flushed_total,
    }


@router.get("/{chapter_id}", response_model=ChapterReadResponse, summary="U007 - Đọc nội dung chương truyện với Redis cache")
def get_chapter(
    chapter_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user=Depends(get_current_user),
):
    redis_client = get_redis_client()
    chapter_data = get_cached_chapter(redis_client, chapter_id)
    cache_status = "hit" if chapter_data else "miss"

    if not chapter_data:
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
        if chapter.moderation_status != "approved" and chapter.story.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chapter is not available")
        if chapter.publish_at > datetime.utcnow() and chapter.story.author_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chapter is not published yet")
        chapter_data = serialize_chapter(chapter)
        cache_chapter(redis_client, chapter_data)

    ensure_chapter_is_available(chapter_data, current_user)
    ensure_reader_can_read(chapter_data, current_user)
    view_count_buffered = increment_story_view(redis_client, chapter_data["story_id"])
    update_reading_history(db, current_user.id, chapter_id)
    db.commit()

    return {
        "id": chapter_data["id"],
        "story_id": chapter_data["story_id"],
        "chapter_number": chapter_data["chapter_number"],
        "title": chapter_data["title"],
        "content": chapter_data["content"],
        "moderation_status": chapter_data["moderation_status"],
        "is_premium": chapter_data["is_premium"],
        "publish_at": chapter_data["publish_at"],
        "cache_status": cache_status,
        "view_count_buffered": view_count_buffered,
    }


@router.post("/{chapter_id}/comments", summary="U010 - Đăng tải bình luận/đánh giá phân cấp thời gian thực")
def add_comment(chapter_id: str, db: Session = Depends(deps.get_db)):
    return {"message": "Comment registered and broadcasted", "chapter_id": chapter_id}


@author_router.put("/{chapter_id}/draft", response_model=ChapterResponse, summary="U004 - Autosave draft fallback qua REST")
def save_author_draft(
    chapter_id: UUID,
    draft_in: ChapterUpdate,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author),
):
    chapter = get_author_chapter_or_404(db, chapter_id, current_author)
    apply_chapter_update(chapter, draft_in)
    db.commit()
    db.refresh(chapter)
    return chapter


@author_router.websocket("/{chapter_id}/ws")
async def websocket_editor(websocket: WebSocket, chapter_id: UUID):
    """
    U004 - WebSocket Autosave Editor Connection.
    Receives {title, content}, writes the draft to PostgreSQL, and confirms success.
    """
    await websocket.accept()
    db = SessionLocal()

    try:
        current_author = get_websocket_author(websocket)
        chapter = get_author_chapter_or_404(db, chapter_id, current_author)
        await websocket.send_json(
            {
                "type": "connected",
                "chapter_id": str(chapter.id),
                "message": "WebSocket editor connection established for autosave.",
            }
        )

        while True:
            payload = await websocket.receive_json()
            try:
                message = normalize_autosave_payload(payload)
                apply_chapter_update(
                    chapter,
                    autosave_update_from_message(message),
                )
                db.commit()
                db.refresh(chapter)
                await websocket.send_json(
                    {
                        "type": "autosave",
                        "status": "success",
                        "message": "Autosave success",
                        "chapter_id": str(chapter.id),
                        "saved_at": chapter.updated_at.isoformat(),
                    }
                )
            except (ValidationError, ValueError) as exc:
                db.rollback()
                await websocket.send_json(
                    {
                        "type": "autosave",
                        "status": "error",
                        "message": str(exc),
                    }
                )
            except Exception:
                db.rollback()
                await websocket.send_json(
                    {
                        "type": "autosave",
                        "status": "error",
                        "message": "Autosave failed. Please retry.",
                    }
                )
    except WebSocketDisconnect:
        return
    except HTTPException as exc:
        if websocket.client_state != WebSocketState.DISCONNECTED:
            await websocket.send_json(
                {
                    "type": "connection",
                    "status": "error",
                    "message": exc.detail,
                }
            )
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    finally:
        db.close()
