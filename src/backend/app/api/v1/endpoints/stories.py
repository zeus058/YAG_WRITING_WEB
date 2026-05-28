"""
Stories & Novel Creation Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U003 - TC-018).
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.api import deps
from app.models.story import Story, Chapter
from app.schemas.story import StoryCreate, StoryUpdate, StoryResponse, StoryDetailResponse, ChapterResponse
from typing import List
import uuid

router = APIRouter()

@router.post("/", response_model=StoryResponse, summary="U003 - Khởi tạo bộ truyện mới")
def create_story(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    cover_file: UploadFile = File(None),
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    if current_author.role != 'author':
        raise HTTPException(status_code=403, detail="Only authors can create stories")
    
    # Check duplicate title
    existing_story = db.query(Story).filter(Story.title == title).first()
    if existing_story:
        raise HTTPException(status_code=400, detail="Story title already exists")
    
    # Mock Cloudinary upload
    cover_url = None
    if cover_file:
        cover_url = f"https://res.cloudinary.com/mock/image/upload/yag/covers/{cover_file.filename}"

    new_story = Story(
        author_id=current_author.id,
        title=title,
        description=description,
        category=category,
        cover_url=cover_url
    )
    db.add(new_story)
    db.commit()
    db.refresh(new_story)
    return new_story

@router.put("/{story_id}", response_model=StoryResponse, summary="U003 - Cập nhật thông tin chung của bộ truyện")
def update_story(
    story_id: str,
    story_in: StoryUpdate,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if story.author_id != current_author.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this story")
    
    update_data = story_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(story, key, value)
    
    db.commit()
    db.refresh(story)
    return story

@router.get("/author/{story_id}/chapters", response_model=List[ChapterResponse], summary="U003 - Quản lý chương của truyện")
def get_author_chapters(
    story_id: str,
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if str(story.author_id) != str(current_author.id):
        raise HTTPException(status_code=403, detail="Not authorized to view these chapters")
    
    chapters = db.query(Chapter).filter(Chapter.story_id == story_id).order_by(Chapter.chapter_number.asc()).all()
    return chapters

@router.get("/my-stories", response_model=List[StoryResponse], summary="Lấy danh sách tất cả truyện của tác giả hiện hành")
def get_my_stories(
    db: Session = Depends(deps.get_db),
    current_author=Depends(deps.get_current_author)
):
    stories = db.query(Story).filter(Story.author_id == current_author.id).all()
    return stories
