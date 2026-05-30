import json
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.admin_alert import AdminAlert
from app.models.admin_audit_log import AdminAuditLog
from app.models.ai_moderation_log import AIModerationLog
from app.models.chapter import Chapter
from app.models.membership import Transaction
from app.models.story import Story
from app.models.user import User


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min).replace(tzinfo=timezone.utc)


def _end_exclusive(value: date) -> datetime:
    return _start_of_day(value + timedelta(days=1))


def _amount_to_million_vnd(value: float) -> float:
    return round(float(value or 0) / 1_000_000, 2)


def _month_key(value: date) -> str:
    return f"{value.year:04d}-{value.month:02d}"


def _add_month(value: date) -> date:
    year = value.year + (1 if value.month == 12 else 0)
    month = 1 if value.month == 12 else value.month + 1
    return date(year, month, 1)


class AdminService:
    @staticmethod
    def _uuid_or_raw(value: str):
        try:
            return uuid.UUID(str(value))
        except (TypeError, ValueError):
            return value

    @staticmethod
    def require_admin(current_user: User) -> User:
        if current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ADMIN_REQUIRED")
        return current_user

    @staticmethod
    def create_audit_log(
        db: Session,
        admin: User,
        action: str,
        target_type: str,
        target_id: str,
        reason: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> AdminAuditLog:
        audit = AdminAuditLog(
            admin_id=admin.id,
            action=action,
            target_type=target_type,
            target_id=str(target_id),
            reason=reason,
            metadata_json=json.dumps(metadata or {}, ensure_ascii=False),
        )
        db.add(audit)
        return audit

    @staticmethod
    def get_dashboard_stats(db: Session) -> dict:
        now = datetime.now(timezone.utc)
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        transactions = db.query(Transaction).filter(Transaction.status == "success").all()
        revenue_total = sum(float(transaction.amount or 0) for transaction in transactions)
        revenue_30d = sum(
            float(transaction.amount or 0)
            for transaction in transactions
            if (created_at := _as_utc(transaction.created_at)) and created_at >= thirty_days_ago
        )

        return {
            "users_total": db.query(User).count(),
            "users_new_7d": db.query(User).filter(User.created_at >= seven_days_ago).count(),
            "users_locked": db.query(User).filter(User.is_locked.is_(True)).count(),
            "stories_total": db.query(Story).count(),
            "chapters_total": db.query(Chapter).count(),
            "premium_revenue_total": _amount_to_million_vnd(revenue_total),
            "premium_revenue_30d": _amount_to_million_vnd(revenue_30d),
            "moderation_pending": db.query(Chapter).filter(Chapter.moderation_status == "pending").count(),
            "moderation_flagged": db.query(Chapter).filter(Chapter.moderation_status == "flagged").count(),
            "moderation_rejected": db.query(Chapter).filter(Chapter.moderation_status == "rejected").count(),
            "moderation_approved": db.query(Chapter).filter(Chapter.moderation_status == "approved").count(),
            "unresolved_admin_alerts": db.query(AdminAlert).filter(AdminAlert.is_resolved.is_(False)).count(),
            "audit_logs_total": db.query(AdminAuditLog).count(),
        }

    @staticmethod
    def get_revenue_series(db: Session, range_name: str) -> dict:
        now = datetime.now(timezone.utc)
        today = now.date()
        unit = "day"

        if range_name == "week":
            start = today - timedelta(days=6)
        elif range_name == "quarter":
            start = date(today.year, today.month, 1)
            for _ in range(2):
                start = date(start.year - 1, 12, 1) if start.month == 1 else date(start.year, start.month - 1, 1)
            unit = "month"
        else:
            range_name = "month"
            start = today - timedelta(days=29)

        start_dt = _start_of_day(start)
        transactions = (
            db.query(Transaction)
            .filter(Transaction.status == "success", Transaction.created_at >= start_dt)
            .all()
        )

        buckets: dict[str, dict[str, float | int]] = {}
        for transaction in transactions:
            created_at = _as_utc(transaction.created_at)
            if not created_at:
                continue
            key = _month_key(created_at.date()) if unit == "month" else created_at.date().isoformat()
            bucket = buckets.setdefault(key, {"revenue_vnd": 0.0, "memberships": 0})
            bucket["revenue_vnd"] = float(bucket["revenue_vnd"]) + float(transaction.amount or 0)
            bucket["memberships"] = int(bucket["memberships"]) + 1

        series = []
        if unit == "month":
            cursor = start
            while cursor <= today:
                key = _month_key(cursor)
                bucket = buckets.get(key, {"revenue_vnd": 0.0, "memberships": 0})
                revenue_vnd = float(bucket["revenue_vnd"])
                series.append(
                    {
                        "label": f"{cursor.month:02d}/{cursor.year}",
                        "revenue": _amount_to_million_vnd(revenue_vnd),
                        "revenue_vnd": revenue_vnd,
                        "memberships": int(bucket["memberships"]),
                    }
                )
                cursor = _add_month(cursor)
        else:
            cursor = start
            while cursor <= today:
                key = cursor.isoformat()
                bucket = buckets.get(key, {"revenue_vnd": 0.0, "memberships": 0})
                revenue_vnd = float(bucket["revenue_vnd"])
                series.append(
                    {
                        "label": cursor.strftime("%d/%m"),
                        "revenue": _amount_to_million_vnd(revenue_vnd),
                        "revenue_vnd": revenue_vnd,
                        "memberships": int(bucket["memberships"]),
                    }
                )
                cursor += timedelta(days=1)

        return {"range": range_name, "series": series}

    @staticmethod
    def get_report_data(db: Session, from_date: date, to_date: date, report_type: str) -> dict:
        if from_date > to_date:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_DATE_RANGE")

        start_dt = _start_of_day(from_date)
        end_dt = _end_exclusive(to_date)
        transactions = (
            db.query(Transaction)
            .filter(Transaction.status == "success", Transaction.created_at >= start_dt, Transaction.created_at < end_dt)
            .all()
        )
        users = db.query(User).filter(User.created_at >= start_dt, User.created_at < end_dt).all()
        chapters = db.query(Chapter).filter(Chapter.created_at >= start_dt, Chapter.created_at < end_dt).all()

        rows = []
        cursor = from_date
        while cursor <= to_date:
            bucket_end = min(cursor + timedelta(days=6), to_date)
            bucket_start_dt = _start_of_day(cursor)
            bucket_end_dt = _end_exclusive(bucket_end)

            revenue_vnd = sum(
                float(transaction.amount or 0)
                for transaction in transactions
                if (created_at := _as_utc(transaction.created_at))
                and bucket_start_dt <= created_at < bucket_end_dt
            )
            user_count = sum(
                1
                for user in users
                if (created_at := _as_utc(user.created_at)) and bucket_start_dt <= created_at < bucket_end_dt
            )
            content_count = sum(
                1
                for chapter in chapters
                if (created_at := _as_utc(chapter.created_at)) and bucket_start_dt <= created_at < bucket_end_dt
            )
            membership_count = sum(
                1
                for transaction in transactions
                if (created_at := _as_utc(transaction.created_at))
                and bucket_start_dt <= created_at < bucket_end_dt
            )

            rows.append(
                {
                    "label": f"{cursor.strftime('%d/%m')} - {bucket_end.strftime('%d/%m')}",
                    "revenue": _amount_to_million_vnd(revenue_vnd),
                    "revenue_vnd": revenue_vnd,
                    "memberships": membership_count,
                    "users": user_count,
                    "content": content_count,
                }
            )
            cursor = bucket_end + timedelta(days=1)

        return {
            "from_date": from_date,
            "to_date": to_date,
            "report_type": report_type,
            "rows": rows,
        }

    @staticmethod
    def get_moderation_queue(db: Session) -> list[dict]:
        chapters = (
            db.query(Chapter)
            .filter(Chapter.moderation_status.in_(["pending", "flagged", "rejected"]))
            .order_by(Chapter.updated_at.desc())
            .limit(100)
            .all()
        )
        return [
            {
                "chapter_id": str(chapter.id),
                "story_id": str(chapter.story_id),
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
                "moderation_status": chapter.moderation_status,
                "updated_at": chapter.updated_at,
            }
            for chapter in chapters
        ]

    @staticmethod
    def lock_user(db: Session, admin: User, user_id: str, reason: str) -> User:
        target = db.query(User).filter(User.id == AdminService._uuid_or_raw(user_id)).first()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")
        if str(target.id) == str(admin.id):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CANNOT_LOCK_SELF")

        previous_state = {
            "is_locked": target.is_locked,
            "locked_reason": target.locked_reason,
        }
        target.is_locked = True
        target.locked_reason = reason
        target.locked_at = datetime.now(timezone.utc)
        db.add(target)
        AdminService.create_audit_log(
            db=db,
            admin=admin,
            action="lock_user",
            target_type="user",
            target_id=str(target.id),
            reason=reason,
            metadata=previous_state,
        )
        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def unlock_user(db: Session, admin: User, user_id: str, reason: str) -> User:
        target = db.query(User).filter(User.id == AdminService._uuid_or_raw(user_id)).first()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="USER_NOT_FOUND")

        previous_state = {
            "is_locked": target.is_locked,
            "locked_reason": target.locked_reason,
        }
        target.is_locked = False
        target.locked_reason = None
        target.locked_at = None
        db.add(target)
        AdminService.create_audit_log(
            db=db,
            admin=admin,
            action="unlock_user",
            target_type="user",
            target_id=str(target.id),
            reason=reason,
            metadata=previous_state,
        )
        db.commit()
        db.refresh(target)
        return target

    @staticmethod
    def override_chapter_moderation(
        db: Session,
        admin: User,
        chapter_id: str,
        decision: str,
        reason: str,
        violation_category: Optional[str] = None,
        confidence_score: float = 1.0,
    ) -> Chapter:
        chapter = db.query(Chapter).filter(Chapter.id == AdminService._uuid_or_raw(chapter_id)).first()
        if not chapter:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CHAPTER_NOT_FOUND")

        previous_status = chapter.moderation_status
        chapter.moderation_status = decision

        moderation_log = AIModerationLog(
            chapter_id=chapter.id,
            is_violation=decision in {"rejected", "flagged"},
            violation_category=violation_category,
            confidence_score=confidence_score,
            reason=f"Admin override: {reason}",
        )
        db.add(chapter)
        db.add(moderation_log)
        AdminService.create_audit_log(
            db=db,
            admin=admin,
            action="override_moderation",
            target_type="chapter",
            target_id=str(chapter.id),
            reason=reason,
            metadata={
                "previous_status": previous_status,
                "new_status": decision,
                "violation_category": violation_category,
                "confidence_score": confidence_score,
            },
        )
        db.commit()
        db.refresh(chapter)
        return chapter
