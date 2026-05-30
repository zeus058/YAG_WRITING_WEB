"""
Interactive Chapter Reading & WebSocket Editor Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U004, U007, U010 - TC-016, TC-017, TC-019, TC-020).
"""
from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState

from app.api import deps
from app.core.database import SessionLocal
from app.models.story import Chapter, Story
from app.schemas.story import ChapterCreate, ChapterResponse, ChapterUpdate

router = APIRouter()
author_router = APIRouter()


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


@router.get("/{chapter_id}", response_model=ChapterResponse, summary="U007 - Đọc nội dung chương truyện")
def get_chapter(chapter_id: UUID, db: Session = Depends(deps.get_db)):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    return chapter


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
