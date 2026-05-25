"""
Stories & Novel Creation Routing Handler.
Assigned Member: Huỳnh Yến Nhi (U003 - TC-018).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps

router = APIRouter()

@router.post("/", summary="U003 - Khởi tạo bộ truyện mới và tải bìa truyện lên Cloudinary")
def create_story(db: Session = Depends(deps.get_db)):
    return {"message": "Story created successfully"}

@router.put("/{story_id}", summary="U003 - Cập nhật thông tin chung của bộ truyện")
def update_story(story_id: str, db: Session = Depends(deps.get_db)):
    return {"message": f"Story {story_id} updated"}
