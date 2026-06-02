import logging
import math
import os
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.admin_alert import AdminAlert
from app.models.chapter import Chapter
from app.models.profile import Profile
from app.models.publish_schedule import PublishSchedule
from app.models.story import Story
from app.models.user import User
from app.services.notification_service import publish_user_notification

logger = logging.getLogger(__name__)

DAILY_JOB_ID = "u014_publish_schedule_monitor"
SECONDS_PER_DAY = 24 * 60 * 60
REPUTATION_PENALTY_PER_DAY = 5
MAX_REPUTATION_PENALTY_PER_MISS = 30
SEVERE_LATE_DAYS = 3

_scheduler: Optional[BackgroundScheduler] = None


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _days_late(scheduled_time: datetime, now: datetime) -> int:
    if scheduled_time.tzinfo is None:
        scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)
    seconds_late = max(0.0, (now - scheduled_time).total_seconds())
    return max(1, math.ceil(seconds_late / SECONDS_PER_DAY))


def _find_publication_for_schedule(db: Session, schedule: PublishSchedule) -> Optional[Chapter]:
    return (
        db.query(Chapter)
        .filter(
            Chapter.story_id == schedule.story_id,
            Chapter.moderation_status == "approved",
            Chapter.publish_at >= schedule.scheduled_time,
        )
        .order_by(Chapter.publish_at.desc())
        .first()
    )


def send_schedule_warning_email(
    recipient: str,
    story_title: str,
    scheduled_time: datetime,
    days_late: int,
    reputation_score: int,
) -> None:
    subject = "[YAG] Canh bao tre lich dang chuong"
    body = (
        f"Tac pham '{story_title}' da tre lich dang chuong.\n"
        f"Lich hen: {scheduled_time.isoformat()}\n"
        f"So ngay tre: {days_late}\n"
        f"Diem uy tin hien tai: {reputation_score}\n"
    )

    print(f"\n[U014 SCHEDULE WARNING] To: {recipient}\n{body}")

    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        logger.info("SMTP credentials are not configured; schedule warning logged only.")
        return

    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = f"YAG Platform <{smtp_user}>"
        msg["To"] = recipient

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=5.0) as server:
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipient, msg.as_string())
    except Exception as exc:
        logger.warning("Failed to send schedule warning email to %s: %s", recipient, exc)


def _notify_admins(db: Session, alert: AdminAlert) -> int:
    admins = db.query(User).filter(User.role == "admin").all()
    payload = {
        "type": "schedule_missed_admin_alert",
        "alert_id": str(alert.id),
        "story_id": str(alert.story_id) if alert.story_id else None,
        "author_id": str(alert.user_id) if alert.user_id else None,
        "severity": alert.severity,
        "message": alert.message,
    }

    sent = 0
    for admin in admins:
        if publish_user_notification(str(admin.id), payload):
            sent += 1
    return sent


def _mark_schedule_published_if_fulfilled(db: Session, schedule: PublishSchedule) -> bool:
    publication = _find_publication_for_schedule(db, schedule)
    if not publication:
        return False

    schedule.status = "published"
    db.add(schedule)
    return True


def _handle_missed_schedule(db: Session, schedule: PublishSchedule, now: datetime) -> Optional[dict]:
    story = db.query(Story).filter(Story.id == schedule.story_id).first()
    if not story:
        logger.warning("Publish schedule %s references missing story %s", schedule.id, schedule.story_id)
        schedule.status = "missed"
        db.add(schedule)
        return None

    author = db.query(User).filter(User.id == story.author_id).first()
    profile = db.query(Profile).filter(Profile.user_id == story.author_id).first()
    days_late = _days_late(schedule.scheduled_time, now)
    penalty = min(days_late * REPUTATION_PENALTY_PER_DAY, MAX_REPUTATION_PENALTY_PER_MISS)

    old_score = profile.reputation_score if profile else None
    new_score = old_score
    if profile:
        profile.reputation_score = max(0, profile.reputation_score - penalty)
        new_score = profile.reputation_score
        db.add(profile)

    schedule.status = "missed"
    db.add(schedule)

    severity = "critical" if days_late >= SEVERE_LATE_DAYS else "warning"
    message = (
        f"Story '{story.title}' missed publish schedule {schedule.scheduled_time.isoformat()} "
        f"by {days_late} day(s). Reputation penalty: {penalty}."
    )
    alert = AdminAlert(
        alert_type="schedule_missed",
        severity=severity,
        user_id=story.author_id,
        story_id=story.id,
        message=message,
    )
    db.add(alert)
    db.flush()

    author_payload = {
        "type": "schedule_missed",
        "story_id": str(story.id),
        "story_title": story.title,
        "schedule_id": str(schedule.id),
        "days_late": days_late,
        "penalty": penalty,
        "reputation_score": new_score,
        "message": message,
    }
    publish_user_notification(str(story.author_id), author_payload)

    if author and author.email:
        send_schedule_warning_email(
            recipient=author.email,
            story_title=story.title,
            scheduled_time=schedule.scheduled_time,
            days_late=days_late,
            reputation_score=new_score if new_score is not None else 0,
        )

    admin_notifications = _notify_admins(db, alert)
    return {
        "schedule_id": str(schedule.id),
        "story_id": str(story.id),
        "author_id": str(story.author_id),
        "days_late": days_late,
        "penalty": penalty,
        "old_reputation_score": old_score,
        "new_reputation_score": new_score,
        "admin_alert_id": str(alert.id),
        "admin_notifications": admin_notifications,
    }


def scan_publish_schedules(db: Session, now: Optional[datetime] = None) -> dict:
    now = now or _now_utc()
    due_schedules = (
        db.query(PublishSchedule)
        .filter(
            PublishSchedule.status == "scheduled",
            PublishSchedule.scheduled_time <= now,
        )
        .all()
    )

    result = {
        "checked": len(due_schedules),
        "published": 0,
        "missed": 0,
        "missed_items": [],
    }

    for schedule in due_schedules:
        if _mark_schedule_published_if_fulfilled(db, schedule):
            result["published"] += 1
            continue

        missed_item = _handle_missed_schedule(db, schedule, now)
        result["missed"] += 1
        if missed_item:
            result["missed_items"].append(missed_item)

    db.commit()
    logger.info(
        "U014 schedule scan complete: checked=%s published=%s missed=%s",
        result["checked"],
        result["published"],
        result["missed"],
    )
    return result


def get_author_schedule_overview(db: Session, author: User, now: Optional[datetime] = None) -> dict:
    now = now or _now_utc()
    profile = db.query(Profile).filter(Profile.user_id == author.id).first()
    stories = db.query(Story).filter(Story.author_id == author.id).all()
    story_ids = [story.id for story in stories]
    story_by_id = {str(story.id): story for story in stories}
    reputation_score = profile.reputation_score if profile else 0

    if not story_ids:
        return {
            "reputation_score": reputation_score,
            "on_time_rate": 0,
            "approved_chapters": 0,
            "followers": 0,
            "reputation_series": [{"label": now.strftime("%d/%m"), "score": reputation_score}],
            "upcoming_schedule": [],
        }

    schedules = (
        db.query(PublishSchedule)
        .filter(PublishSchedule.story_id.in_(story_ids))
        .order_by(PublishSchedule.scheduled_time.asc())
        .all()
    )
    approved_chapters = (
        db.query(Chapter)
        .filter(Chapter.story_id.in_(story_ids), Chapter.moderation_status == "approved")
        .count()
    )
    completed_schedules = [schedule for schedule in schedules if schedule.status in {"published", "missed"}]
    published_count = sum(1 for schedule in completed_schedules if schedule.status == "published")
    on_time_rate = round((published_count / len(completed_schedules)) * 100) if completed_schedules else 100

    upcoming_schedule = []
    for schedule in schedules:
        if schedule.status != "scheduled":
            continue
        story = story_by_id.get(str(schedule.story_id))
        upcoming_schedule.append(
            {
                "date": schedule.scheduled_time.strftime("%d/%m %H:%M"),
                "story": story.title if story else "Unknown story",
                "chapter": "Next chapter",
                "state": "Scheduled" if schedule.scheduled_time > now else "Due",
                "progress": 0 if schedule.scheduled_time > now else 100,
            }
        )
        if len(upcoming_schedule) >= 10:
            break

    return {
        "reputation_score": reputation_score,
        "on_time_rate": on_time_rate,
        "approved_chapters": approved_chapters,
        "followers": 0,
        "reputation_series": [{"label": now.strftime("%d/%m"), "score": reputation_score}],
        "upcoming_schedule": upcoming_schedule,
    }


def run_publish_schedule_scan() -> dict:
    db = SessionLocal()
    try:
        return scan_publish_schedules(db)
    except Exception:
        db.rollback()
        logger.exception("U014 schedule scan failed")
        raise
    finally:
        db.close()


def start_schedule_scheduler() -> None:
    global _scheduler
    if not settings.SCHEDULER_ENABLED:
        logger.info("U014 scheduler disabled by configuration.")
        return
    if _scheduler and _scheduler.running:
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_publish_schedule_scan,
        CronTrigger(hour=settings.SCHEDULE_SCAN_HOUR_UTC, minute=settings.SCHEDULE_SCAN_MINUTE_UTC),
        id=DAILY_JOB_ID,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    _scheduler.start()
    logger.info(
        "U014 scheduler started: daily at %02d:%02d UTC",
        settings.SCHEDULE_SCAN_HOUR_UTC,
        settings.SCHEDULE_SCAN_MINUTE_UTC,
    )


def shutdown_schedule_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("U014 scheduler stopped.")
    _scheduler = None
