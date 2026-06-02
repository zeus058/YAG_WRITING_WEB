"""
Interactive Chapter Reading & WebSocket Editor Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U004, U007, U010 - TC-016, TC-017, TC-019, TC-020).
"""
from datetime import datetime
import asyncio
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
from app.models.story import Chapter, Comment, ReadingHistory, Story
from app.schemas.story import (
    ChapterCreate,
    ChapterReadResponse,
    ChapterResponse,
    ChapterUpdate,
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    CommentTreeListResponse,
    CommentTreeResponse,
    CommentUpdate,
)

router = APIRouter()
author_router = APIRouter()
CHAPTER_CACHE_TTL_SECONDS = 7200
COMMENT_CHANNEL_PREFIX = "chapter:comments"


class CommentConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, chapter_id: UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(str(chapter_id), []).append(websocket)

    def disconnect(self, chapter_id: UUID, websocket: WebSocket) -> None:
        connections = self.active_connections.get(str(chapter_id), [])
        if websocket in connections:
            connections.remove(websocket)
        if not connections:
            self.active_connections.pop(str(chapter_id), None)

    async def broadcast(self, chapter_id: UUID | str, message: dict[str, Any]) -> None:
        connections = list(self.active_connections.get(str(chapter_id), []))
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except RuntimeError:
                self.disconnect(UUID(str(chapter_id)), websocket)


comment_manager = CommentConnectionManager()


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


def comment_channel(chapter_id: UUID | str) -> str:
    return f"{COMMENT_CHANNEL_PREFIX}:{chapter_id}"


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


def serialize_comment(comment: Comment) -> dict[str, Any]:
    return {
        "id": str(comment.id),
        "user_id": str(comment.user_id),
        "chapter_id": str(comment.chapter_id),
        "content": comment.content,
        "parent_id": str(comment.parent_id) if comment.parent_id else None,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
    }


def build_comment_tree(comments: list[Comment]) -> list[dict[str, Any]]:
    nodes = [
        {
            **serialize_comment(comment),
            "replies": [],
        }
        for comment in comments
    ]
    by_id = {node["id"]: node for node in nodes}
    roots = []

    for node in nodes:
        parent_id = node["parent_id"]
        if parent_id and parent_id in by_id:
            by_id[parent_id]["replies"].append(node)
        else:
            roots.append(node)

    return roots


async def publish_comment(redis_client, chapter_id: UUID, comment: Comment) -> None:
    payload = {
        "type": "comment.created",
        "chapter_id": str(chapter_id),
        "comment": serialize_comment(comment),
    }
    if not redis_client:
        await comment_manager.broadcast(chapter_id, payload)
        return
    try:
        redis_client.publish(comment_channel(chapter_id), json.dumps(payload))
    except redis.RedisError:
        await comment_manager.broadcast(chapter_id, payload)


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


@router.get(
    "/{chapter_id}/comments",
    response_model=CommentListResponse,
    summary="U010 - Lấy danh sách bình luận của chương",
)
def get_comments(chapter_id: UUID, db: Session = Depends(deps.get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    comments = (
        db.query(Comment)
        .filter(Comment.chapter_id == chapter_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return {"comments": comments}


@router.get(
    "/{chapter_id}/comments/tree",
    response_model=CommentTreeListResponse,
    summary="U010 - Lấy cây bình luận phân cấp của chương",
)
def get_comment_tree(chapter_id: UUID, db: Session = Depends(deps.get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    comments = (
        db.query(Comment)
        .filter(Comment.chapter_id == chapter_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return {"comments": build_comment_tree(comments)}


@router.post(
    "/{chapter_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="U010 - Đăng tải bình luận phân cấp thời gian thực",
)
async def add_comment(
    chapter_id: UUID,
    comment_in: CommentCreate,
    db: Session = Depends(deps.get_db),
    current_user=Depends(get_current_user),
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")

    content = comment_in.content.strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment content cannot be empty")

    if comment_in.parent_id:
        parent = (
            db.query(Comment)
            .filter(Comment.id == comment_in.parent_id, Comment.chapter_id == chapter_id)
            .first()
        )
        if not parent:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent comment is invalid")

    comment = Comment(
        user_id=current_user.id,
        chapter_id=chapter_id,
        content=content,
        parent_id=comment_in.parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    await publish_comment(get_redis_client(), chapter_id, comment)
    return comment


@router.put(
    "/{chapter_id}/comments/{comment_id}",
    response_model=CommentResponse,
    summary="U010 - Sửa bình luận của người dùng hiện tại",
)
async def update_comment(
    chapter_id: UUID,
    comment_id: UUID,
    comment_in: CommentUpdate,
    db: Session = Depends(deps.get_db),
    current_user=Depends(get_current_user),
):
    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.chapter_id == chapter_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this comment")

    content = comment_in.content.strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Comment content cannot be empty")

    comment.content = content
    comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)

    await publish_comment(get_redis_client(), chapter_id, comment)
    return comment


@router.delete(
    "/{chapter_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="U010 - Xóa bình luận của người dùng hiện tại",
)
def delete_comment(
    chapter_id: UUID,
    comment_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user=Depends(get_current_user),
):
    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.chapter_id == chapter_id)
        .first()
    )
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()
    return None


@router.websocket("/{chapter_id}/comments/ws")
async def websocket_comments(websocket: WebSocket, chapter_id: UUID):
    """
    U010 - WebSocket channel for live chapter comments.
    REST comment creation broadcasts {type: "comment.created", comment: ...}.
    """
    await comment_manager.connect(chapter_id, websocket)
    redis_client = get_redis_client()
    pubsub = None
    listener_task = None

    async def redis_listener():
        while True:
            message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("data"):
                await websocket.send_text(message["data"])
            await asyncio.sleep(0.1)

    try:
        await websocket.send_json(
            {
                "type": "connected",
                "chapter_id": str(chapter_id),
                "message": "Connected to live comments.",
            }
        )
        try:
            pubsub = redis_client.pubsub()
            pubsub.subscribe(comment_channel(chapter_id))
            listener_task = asyncio.create_task(redis_listener())
        except redis.RedisError:
            pubsub = None

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        return
    finally:
        if listener_task:
            listener_task.cancel()
        if pubsub:
            pubsub.close()
        comment_manager.disconnect(chapter_id, websocket)


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
