import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api import deps
from app.core.config import settings
from app.core.security import ALGORITHM
from app.models.admin_alert import AdminAlert
from app.models.user import User
from app.services.notification_service import create_notification
from app.schemas.common import StandardResponse

logger = logging.getLogger(__name__)

router = APIRouter()


class SupportTicketRequest(BaseModel):
    name: str
    email: str
    subject: str
    content: str
    agreePrivacy: bool


def _get_optional_user(
    db: Session = Depends(deps.get_db),
    authorization: Optional[str] = Header(None),
) -> Optional[User]:
    """Extract user from token if present, otherwise return None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except (JWTError, Exception):
        return None


@router.post("/ticket", response_model=StandardResponse, summary="Submit a support ticket")
def submit_ticket(
    request: SupportTicketRequest,
    db: Session = Depends(deps.get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    # 1. Create AdminAlert
    user_id = current_user.id if current_user else None

    alert = AdminAlert(
        alert_type="support_ticket",
        severity="info",
        user_id=user_id,
        message=f"[{request.subject}] From {request.name} ({request.email}): {request.content}",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # 2. Notify all admins
    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        create_notification(
            db,
            user_id=admin.id,
            type="support_ticket",
            title="Yêu cầu hỗ trợ mới",
            message=f"Người dùng {request.name} vừa gửi một yêu cầu: {request.subject}.",
            payload={"alert_id": str(alert.id), "email": request.email},
        )

    return StandardResponse(success=True, message="Ticket submitted successfully")
