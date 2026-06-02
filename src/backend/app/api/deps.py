"""
FastAPI Route Dependency Injection Modules.
Provides database sessions, authenticated current user states, and RBAC filters.
"""
from typing import Generator, Optional
import uuid
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User
from app.models.chapter import Chapter

# oauth2_scheme parses the incoming "Authorization: Bearer <token>" header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False  # Make it graceful so we can raise custom clear exception details
)

def get_db() -> Generator:
    """Dependency injector for database sessions."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    """Validates the JWT token signature and retrieves the matching User model."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="INVALID_OR_EXPIRED_TOKEN",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
        
    try:
        # Decode using HS256 algorithm and the core system secret key
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Query the user database record
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
        
    return user

def get_current_user_optional(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    Optional authentication dependency.
    Returns the User if a valid token is present, otherwise None.
    """
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except JWTError:
        return None

def get_current_author(current_user: User = Depends(get_current_user)) -> User:
    """Enforces that the authenticated user has the 'author' or 'admin' role."""
    if current_user.role not in ["author", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền tác giả"
        )
    return current_user

require_author_role = get_current_author

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
    premium_until = user.premium_until
    if premium_until is not None:
        # Check if premium_until is offset-aware. If not, make naive comparison
        if premium_until.tzinfo is None:
            now_naive = datetime.utcnow()
            if premium_until < now_naive:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Gói Premium đã hết hạn hoặc chưa được kích hoạt. Vui lòng gia hạn.",
                )
        else:
            if premium_until < now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Gói Premium đã hết hạn hoặc chưa được kích hoạt. Vui lòng gia hạn.",
                )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chương này dành cho thành viên Premium. Vui lòng nâng cấp gói hội viên.",
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


def require_authenticated_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """
    Decodes the JWT token and returns the payload dict containing user identity ('sub', etc.).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="INVALID_OR_EXPIRED_TOKEN",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception

