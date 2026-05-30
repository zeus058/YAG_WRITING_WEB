"""
Stories & Novel Creation Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U003 - TC-018).
"""
import shutil
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.api import deps
from app.models.story import Story, Chapter
from app.schemas.story import StoryStatus, StoryUpdate, StoryResponse, StoryDetailResponse, ChapterResponse
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from uuid import UUID, uuid4

router = APIRouter()
COVER_UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "covers"
COVER_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_story_or_404(db: Session, story_id: UUID) -> Story:
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


def save_cover_file(cover_file: UploadFile, request: Request) -> str:
    suffix = Path(cover_file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    filename = f"{uuid4().hex}{suffix}"
    destination = COVER_UPLOAD_DIR / filename
    cover_file.file.seek(0)
    with destination.open("wb") as buffer:
        shutil.copyfileobj(cover_file.file, buffer)

    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/media/covers/{filename}"


@router.post("/", response_model=StoryResponse, summary="U003 - Khởi tạo bộ truyện mới")
def create_story(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    status_value: StoryStatus = Form("ongoing", alias="status"),
    cover_file: Optional[UploadFile] = File(None),
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    if current_author.role != "author":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only authors can create stories")

    existing_story = db.query(Story).filter(Story.title == title).first()
    if existing_story:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Story title already exists")

    cover_url = None
    if cover_file:
        cover_url = save_cover_file(cover_file, request)

    new_story = Story(
        author_id=current_author.id,
        title=title,
        description=description,
        category=category,
        status=status_value,
        cover_url=cover_url,
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)
    return new_story


@router.get("/", response_model=List[StoryResponse], summary="U007 - Danh sách truyện public")
def list_stories(
    category: Optional[str] = None,
    status_value: Optional[StoryStatus] = Query(None, alias="status"),
    q: Optional[str] = None,
    db: Session = Depends(deps.get_db),
):
    query = db.query(Story)
    if category:
        query = query.filter(Story.category == category)
    if status_value:
        query = query.filter(Story.status == status_value)
    if q:
        pattern = f"%{q}%"
        query = query.filter(or_(Story.title.ilike(pattern), Story.description.ilike(pattern)))

    return query.order_by(Story.updated_at.desc()).all()


@router.get("/my-stories", response_model=List[StoryResponse], summary="U003 - Danh sách truyện của tác giả hiện hành")
def get_my_stories(
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    return (
        db.query(Story)
        .filter(Story.author_id == current_author.id)
        .order_by(Story.updated_at.desc())
        .all()
    )


@router.get(
    "/author/{story_id}/chapters",
    response_model=List[ChapterResponse],
    summary="U003 - Quản lý chương của truyện theo tác giả",
)
def get_author_chapters(
    story_id: UUID,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    story = get_story_or_404(db, story_id)
    if story.author_id != current_author.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view these chapters")

    return (
        db.query(Chapter)
        .filter(Chapter.story_id == story_id)
        .order_by(Chapter.chapter_number.asc())
        .all()
    )


@router.get("/{story_id}", response_model=StoryDetailResponse, summary="U007 - Chi tiết tác phẩm")
def get_story_detail(story_id: UUID, db: Session = Depends(deps.get_db)):
    story = get_story_or_404(db, story_id)
    chapters = (
        db.query(Chapter)
        .filter(
            Chapter.story_id == story_id,
            Chapter.moderation_status == "approved",
            Chapter.publish_at <= datetime.utcnow(),
        )
        .order_by(Chapter.chapter_number.asc())
        .all()
    )
    return {
        "id": story.id,
        "author_id": story.author_id,
        "title": story.title,
        "description": story.description,
        "category": story.category,
        "status": story.status,
        "cover_url": story.cover_url,
        "view_count": story.view_count,
        "rating_avg": story.rating_avg,
        "created_at": story.created_at,
        "updated_at": story.updated_at,
        "chapters": chapters,
    }


@router.put("/{story_id}", response_model=StoryResponse, summary="U003 - Cập nhật thông tin chung của bộ truyện")
async def update_story(
    story_id: UUID,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    story = get_story_or_404(db, story_id)
    if story.author_id != current_author.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this story")

    content_type = request.headers.get("content-type", "")
    cover_file = None

    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        story_in = StoryUpdate(
            title=str(form["title"]) if "title" in form and form["title"] else None,
            description=str(form["description"]) if "description" in form and form["description"] else None,
            category=str(form["category"]) if "category" in form and form["category"] else None,
            status=str(form["status"]) if "status" in form and form["status"] else None,
        )
        cover_candidate = form.get("cover_file")
        if hasattr(cover_candidate, "filename"):
            cover_file = cover_candidate
    else:
        payload = await request.json()
        story_in = StoryUpdate(**payload)

    if story_in.title:
        existing_story = (
            db.query(Story)
            .filter(Story.title == story_in.title, Story.id != story_id)
            .first()
        )
        if existing_story:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Story title already exists")

    update_data = story_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(story, key, value)
    if cover_file:
        story.cover_url = save_cover_file(cover_file, request)

    db.commit()
    db.refresh(story)
    return story


@router.get("/{story_id}/chapters", response_model=List[ChapterResponse], summary="U007 - Danh sách chương public")
def get_public_chapters(
    story_id: UUID,
    db: Session = Depends(deps.get_db),
):
    get_story_or_404(db, story_id)
    return (
        db.query(Chapter)
        .filter(
            Chapter.story_id == story_id,
            Chapter.moderation_status == "approved",
            Chapter.publish_at <= datetime.utcnow(),
        )
        .order_by(Chapter.chapter_number.asc())
        .all()
    )
