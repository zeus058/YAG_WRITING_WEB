"""
FastAPI Route Dependency Injection Modules.
Provides database sessions, authenticated current user states, and RBAC filters.
"""
from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import SessionLocal

bearer_scheme = HTTPBearer(auto_error=False)

def get_db() -> Generator:
    """Dependency injector for database sessions."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_token_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    """Decode the current bearer token and return its payload."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization token is required",
        )

    try:
        return jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=["HS256"],
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def require_author_role(payload=Depends(get_current_token_payload)):
    """Allow only author/admin roles when the token carries role metadata."""
    role = payload.get("role")
    if role not in {"author", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Author access is required",
        )
    return payload


def require_authenticated_user(payload=Depends(get_current_token_payload)):
    """Return the current authenticated token payload."""
    return payload
