"""
FastAPI Route Dependency Injection Modules.
Provides database sessions, authenticated current user states, and RBAC filters.
"""
import uuid
from datetime import datetime, timezone
from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.models.chapter import Chapter


# ---------------------------------------------------------------------------
# Database session dependency
# ---------------------------------------------------------------------------

def get_db() -> Generator:
    """Dependency injector for database sessions."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# OAuth2 / JWT token scheme
# ---------------------------------------------------------------------------

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=True,
)

reusable_oauth2_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


def _decode_token_subject(token: str) -> str:
    """Decode JWT and return the 'sub' claim (user UUID string)."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub: str = payload.get("sub")
        if sub is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload missing 'sub' claim",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return sub
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# Current user dependencies
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(reusable_oauth2),
    db: Session = Depends(get_db),
) -> User:
    """
    Mandatory authentication dependency.
    Decodes the JWT, queries the user, and raises 401 if not found.
    """
    user_id_str = _decode_token_subject(token)
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token",
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_current_user_optional(
    token: Optional[str] = Depends(reusable_oauth2_optional),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Optional authentication dependency.
    Returns the User if a valid token is present, otherwise None.
    Useful for endpoints that behave differently for guests vs logged-in users.
    """
    if token is None:
        return None
    try:
        user_id_str = _decode_token_subject(token)
        user_uuid = uuid.UUID(user_id_str)
        return db.query(User).filter(User.id == user_uuid).first()
    except (HTTPException, ValueError):
        return None


# ---------------------------------------------------------------------------
# RBAC helpers
# ---------------------------------------------------------------------------

def check_premium_access(chapter: Chapter, user: Optional[User]) -> None:
    """
    Validate that a user may read a premium chapter.
    Raises HTTP 403 if the chapter is premium and the user lacks an active subscription.
    """
    if not chapter.is_premium:
        return  # Free chapter — always allowed

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chương này dành cho thành viên Premium. Vui lòng nâng cấp gói hội viên.",
        )

    now = datetime.now(timezone.utc)
    if user.premium_until is None or user.premium_until < now:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gói Premium đã hết hạn hoặc chưa được kích hoạt. Vui lòng gia hạn.",
        )


def require_role(required_role: str):
    """
    Factory dependency that checks the current user's role.
    Usage: Depends(require_role("admin"))
    """
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Yêu cầu quyền '{required_role}' để truy cập tài nguyên này.",
            )
        return current_user
    return _check
