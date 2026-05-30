from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.admin_alert import AdminAlert
from app.models.admin_audit_log import AdminAuditLog
from app.models.user import User
from app.schemas.admin import (
    AdminReasonRequest,
    AdminReportRequest,
    AdminReportResponse,
    AdminRevenueSeriesResponse,
    AdminStatsResponse,
    ModerationOverrideRequest,
)
from app.services.admin_service import AdminService
from app.services.schedule_service import scan_publish_schedules

router = APIRouter()


def _require_admin(current_user: User = Depends(deps.get_current_user)) -> User:
    return AdminService.require_admin(current_user)


@router.get("/stats", response_model=AdminStatsResponse, summary="U015 - Admin quick statistics")
@router.get("/dashboard/stats", response_model=AdminStatsResponse, include_in_schema=False)
def get_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    return AdminService.get_dashboard_stats(db)


@router.get("/revenue-series", response_model=AdminRevenueSeriesResponse, summary="U015 - Revenue chart series")
def get_revenue_series(
    range: str = "month",
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    if range not in {"week", "month", "quarter"}:
        range = "month"
    return AdminService.get_revenue_series(db, range)


@router.post("/reports", response_model=AdminReportResponse, summary="U015 - Admin report chart data")
def get_report_data(
    request: AdminReportRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    return AdminService.get_report_data(db, request.from_date, request.to_date, request.report_type)


@router.post("/users/{user_id}/lock", summary="U015 - Lock a violating user account")
def lock_user(
    user_id: str,
    request: AdminReasonRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    target = AdminService.lock_user(db, current_user, user_id, request.reason)
    return {
        "user_id": str(target.id),
        "is_locked": target.is_locked,
        "locked_reason": target.locked_reason,
        "locked_at": target.locked_at,
    }


@router.post("/users/{user_id}/unlock", summary="U015 - Unlock a user account")
def unlock_user(
    user_id: str,
    request: AdminReasonRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    target = AdminService.unlock_user(db, current_user, user_id, request.reason)
    return {
        "user_id": str(target.id),
        "is_locked": target.is_locked,
        "locked_reason": target.locked_reason,
        "locked_at": target.locked_at,
    }


@router.get("/moderation/queue", summary="U013/U015 - Admin moderation queue")
def get_moderation_queue(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    return AdminService.get_moderation_queue(db)


@router.post("/moderation/{chapter_id}/override", summary="U015 - Override AI moderation decision")
def override_moderation(
    chapter_id: str,
    request: ModerationOverrideRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    chapter = AdminService.override_chapter_moderation(
        db=db,
        admin=current_user,
        chapter_id=chapter_id,
        decision=request.decision,
        reason=request.reason,
        violation_category=request.violation_category,
        confidence_score=request.confidence_score,
    )
    return {
        "chapter_id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "moderation_status": chapter.moderation_status,
    }


@router.post("/moderation/{chapter_id}/approve", summary="U015 - Manually approve flagged chapter")
def approve_moderation(
    chapter_id: str,
    request: AdminReasonRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    chapter = AdminService.override_chapter_moderation(
        db=db,
        admin=current_user,
        chapter_id=chapter_id,
        decision="approved",
        reason=request.reason,
        confidence_score=1.0,
    )
    return {
        "chapter_id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "moderation_status": chapter.moderation_status,
    }


@router.post("/moderation/{chapter_id}/reject", summary="U015 - Manually reject chapter")
def reject_moderation(
    chapter_id: str,
    request: AdminReasonRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    chapter = AdminService.override_chapter_moderation(
        db=db,
        admin=current_user,
        chapter_id=chapter_id,
        decision="rejected",
        reason=request.reason,
        violation_category="admin_rejected",
        confidence_score=1.0,
    )
    return {
        "chapter_id": str(chapter.id),
        "story_id": str(chapter.story_id),
        "moderation_status": chapter.moderation_status,
    }


@router.get("/audit-logs", summary="U015 - Admin audit trail")
def get_audit_logs(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(100).all()
    return [
        {
            "id": str(log.id),
            "admin_id": str(log.admin_id) if log.admin_id else None,
            "action": log.action,
            "target_type": log.target_type,
            "target_id": log.target_id,
            "reason": log.reason,
            "metadata_json": log.metadata_json,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@router.get("/schedule-alerts", summary="U014 - List missed schedule alerts for Admin Dashboard")
def get_schedule_alerts(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    alerts = (
        db.query(AdminAlert)
        .filter(AdminAlert.alert_type == "schedule_missed")
        .order_by(AdminAlert.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(alert.id),
            "severity": alert.severity,
            "user_id": str(alert.user_id) if alert.user_id else None,
            "story_id": str(alert.story_id) if alert.story_id else None,
            "message": alert.message,
            "is_resolved": alert.is_resolved,
            "created_at": alert.created_at,
        }
        for alert in alerts
    ]


@router.post("/schedule-scan", summary="U014 - Run publish schedule scan now")
def run_schedule_scan_now(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(_require_admin),
):
    return scan_publish_schedules(db)
