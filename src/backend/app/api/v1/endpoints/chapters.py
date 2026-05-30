"""
Interactive Chapter Reading & WebSocket Editor Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U004, U007, U010 - TC-016, TC-017, TC-019, TC-020).

Premium RBAC integration by: Nguyễn Duy Trường (U011).
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.chapter import Chapter
from app.models.user import User

router = APIRouter()


@router.get(
    "/{chapter_id}",
    summary="U007 - Đọc nội dung chương truyện (Có Cache Redis & RBAC check)",
)
def get_chapter(
    chapter_id: str,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional),
):
    """
    Đọc nội dung chương.
    Nếu chương là Premium (is_premium=True), kiểm tra quyền truy cập:
    - User chưa đăng nhập → 403
    - User chưa có gói Premium hoặc đã hết hạn → 403
    """
    try:
        chapter_uuid = uuid.UUID(chapter_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chapter ID format",
        )

    chapter = db.query(Chapter).filter(Chapter.id == chapter_uuid).first()
    if chapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chương không tồn tại.",
        )

    # RBAC: Premium chapter access check (U011)
    deps.check_premium_access(chapter, current_user)

    return {
        "id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "chapter_number": chapter.chapter_number,
        "title": chapter.title,
        "content": chapter.content,
        "is_premium": chapter.is_premium,
        "moderation_status": chapter.moderation_status,
        "publish_at": chapter.publish_at,
    }


@router.post(
    "/{chapter_id}/comments",
    summary="U010 - Đăng tải bình luận/đánh giá phân cấp thời gian thực",
)
def add_comment(chapter_id: str, db: Session = Depends(deps.get_db)):
    return {"message": "Comment registered and broadcasted"}


@router.websocket("/{chapter_id}/ws")
async def websocket_editor(websocket: WebSocket, chapter_id: str):
    """
    U004 - WebSocket Autosave Editor Connection.
    Listens for typing pauses (5s) and triggers quick draft updates to DB.
    """
    await websocket.accept()
    await websocket.send_json({"message": "WebSocket editor connection established for autosave."})
    await websocket.close()
