"""
Stories & Novel Creation Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U003 - TC-018).
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.api import deps
from app.models.story import Chapter, Library, Review, Story
from app.services.media_service import upload_story_cover_to_cloudinary
from app.schemas.story import (
    BookmarkResponse,
    ChapterResponse,
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    StoryDetailResponse,
    StoryResponse,
    StoryStatus,
    StoryUpdate,
)
from datetime import datetime
from typing import List, Optional
from uuid import UUID

router = APIRouter()


def get_story_or_404(db: Session, story_id: UUID) -> Story:
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return story


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
        cover_url = upload_story_cover_to_cloudinary(cover_file)

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


@router.post("/{story_id}/bookmark", response_model=BookmarkResponse, summary="U007 - Thêm hoặc bỏ truyện khỏi thư viện cá nhân")
def toggle_bookmark(
    story_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_author),
):
    get_story_or_404(db, story_id)
    bookmark = (
        db.query(Library)
        .filter(Library.user_id == current_user.id, Library.story_id == story_id)
        .first()
    )

    if bookmark:
        db.delete(bookmark)
        db.commit()
        return {
            "story_id": story_id,
            "bookmarked": False,
            "message": "Story removed from library",
        }

    db.add(Library(user_id=current_user.id, story_id=story_id))
    db.commit()
    return {
        "story_id": story_id,
        "bookmarked": True,
        "message": "Story added to library",
    }


@router.get("/library/me", response_model=List[StoryResponse], summary="U007 - Lấy thư viện cá nhân của người dùng")
def get_my_library(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_author),
):
    return (
        db.query(Story)
        .join(Library, Library.story_id == Story.id)
        .filter(Library.user_id == current_user.id)
        .order_by(Library.bookmarked_at.desc())
        .all()
    )


def refresh_story_rating(db: Session, story: Story) -> None:
    rating_avg = db.query(func.avg(Review.rating)).filter(Review.story_id == story.id).scalar()
    story.rating_avg = round(float(rating_avg or 0), 2)


@router.post(
    "/{story_id}/reviews",
    response_model=ReviewResponse,
    summary="U010 - Đánh giá sao cho tác phẩm",
)
def submit_review(
    story_id: UUID,
    review_in: ReviewCreate,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_author),
):
    story = get_story_or_404(db, story_id)
    content = review_in.content.strip() if review_in.content else None

    review = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.story_id == story_id)
        .first()
    )
    if review:
        review.rating = review_in.rating
        review.content = content
        review.updated_at = datetime.utcnow()
    else:
        review = Review(
            user_id=current_user.id,
            story_id=story_id,
            rating=review_in.rating,
            content=content,
        )
        db.add(review)

    db.flush()
    refresh_story_rating(db, story)
    db.commit()
    db.refresh(review)
    return review


@router.get(
    "/{story_id}/reviews",
    response_model=ReviewListResponse,
    summary="U010 - Lấy danh sách đánh giá của tác phẩm",
)
def get_reviews(story_id: UUID, db: Session = Depends(deps.get_db)):
    get_story_or_404(db, story_id)
    reviews = (
        db.query(Review)
        .filter(Review.story_id == story_id)
        .order_by(Review.updated_at.desc())
        .all()
    )
    return {"reviews": reviews}


@router.put(
    "/{story_id}/reviews/me",
    response_model=ReviewResponse,
    summary="U010 - Cập nhật đánh giá của người dùng hiện tại",
)
def update_my_review(
    story_id: UUID,
    review_in: ReviewCreate,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_author),
):
    story = get_story_or_404(db, story_id)
    review = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.story_id == story_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    review.rating = review_in.rating
    review.content = review_in.content.strip() if review_in.content else None
    review.updated_at = datetime.utcnow()
    refresh_story_rating(db, story)
    db.commit()
    db.refresh(review)
    return review


@router.delete(
    "/{story_id}/reviews/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="U010 - Xóa đánh giá của người dùng hiện tại",
)
def delete_my_review(
    story_id: UUID,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_author),
):
    story = get_story_or_404(db, story_id)
    review = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.story_id == story_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    db.delete(review)
    db.flush()
    refresh_story_rating(db, story)
    db.commit()
    return None


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
        story.cover_url = upload_story_cover_to_cloudinary(cover_file)

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
