import asyncio
from functools import partial

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.api.v1.endpoints.chapters import get_redis_client, invalidate_chapter_cache
from app.core.config import settings
from app.models.publish_schedule import PublishSchedule
from app.models.story import Story
from app.models.user import User
from app.schemas.publish import PublishChapterRequest, PublishChapterResponse
from app.services.publish_service import (
    PUBLISH_QUEUE_NAME,
    prepare_chapter_for_publish,
    push_publish_task_to_queue,
    restore_chapter_publish_state,
)
from app.services.schedule_service import get_author_schedule_overview

router = APIRouter()


class ScheduleUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cadence: str | None = Field(default=None, max_length=50)
    next_chapter_at: str = Field(
        ...,
        validation_alias=AliasChoices("next_chapter_at", "nextChapterAt"),
    )


@router.post(
    "/chapters/{chapter_id}/publish",
    include_in_schema=False,
    status_code=status.HTTP_202_ACCEPTED,
    response_model=PublishChapterResponse,
)
@router.post(
    "/author/chapters/{chapter_id}/publish",
    summary="U005 - Queue a chapter publishing request for AI moderation",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=PublishChapterResponse,
)
async def request_publish_chapter(
    chapter_id: str,
    request: PublishChapterRequest | None = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    request = request or PublishChapterRequest()

    try:
        prepared = prepare_chapter_for_publish(
            chapter_id=chapter_id,
            db=db,
            current_user=current_user,
            publish_at=request.publish_at,
            is_premium=request.is_premium,
        )
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    loop = asyncio.get_running_loop()
    success = await loop.run_in_executor(
        None,
        partial(push_publish_task_to_queue, prepared.payload),
    )

    if not success:
        restore_chapter_publish_state(
            chapter_id,
            db,
            prepared.previous_status,
            prepared.previous_is_premium,
            prepared.previous_publish_at,
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot connect to RabbitMQ at {settings.RABBITMQ_HOST}. Try again later.",
        )

    invalidate_chapter_cache(get_redis_client(), chapter_id)

    return {
        "status": "accepted",
        "message": "Publish request accepted and queued for AI moderation.",
        "chapter_id": prepared.payload.chapter_id,
        "story_id": prepared.payload.story_id,
        "queue": PUBLISH_QUEUE_NAME,
        "moderation_status": "pending",
        "publish_at": prepared.payload.publish_at,
        "is_premium": request.is_premium,
        "queued_at": prepared.payload.requested_at,
    }


@router.get("/author/schedule/overview", summary="U014 - Author schedule chart data")
def get_author_schedule_chart_data(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role not in {"author", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="AUTHOR_REQUIRED")
    return get_author_schedule_overview(db, current_user)


@router.put("/author/stories/{story_id}/schedule", summary="U014 - Update next publish schedule")
def update_author_story_schedule(
    story_id: str,
    request: ScheduleUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    if current_user.role != "admin" and str(story.author_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this story")

    try:
        from datetime import datetime

        scheduled_time = datetime.fromisoformat(request.next_chapter_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_NEXT_CHAPTER_AT") from exc

    schedule = (
        db.query(PublishSchedule)
        .filter(PublishSchedule.story_id == story.id, PublishSchedule.status == "scheduled")
        .order_by(PublishSchedule.scheduled_time.asc())
        .first()
    )
    if schedule:
        schedule.scheduled_time = scheduled_time
    else:
        schedule = PublishSchedule(story_id=story.id, scheduled_time=scheduled_time, status="scheduled")
        db.add(schedule)

    db.commit()
    db.refresh(schedule)
    return {
        "story_id": str(story.id),
        "schedule_id": str(schedule.id),
        "cadence": request.cadence,
        "next_chapter_at": schedule.scheduled_time,
        "status": schedule.status,
    }
