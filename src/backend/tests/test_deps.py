import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.user import User
from app.models.chapter import Chapter
from app.api.deps import (
    get_db,
    get_current_user,
    get_current_user_optional,
    get_current_author,
    check_premium_access,
    require_role,
    require_authenticated_user,
)


def test_get_db():
    mock_db = MagicMock()
    with patch("app.api.deps.SessionLocal", return_value=mock_db):
        gen = get_db()
        db = next(gen)
        assert db == mock_db
        try:
            next(gen)
        except StopIteration:
            pass
        mock_db.close.assert_called_once()


def test_get_current_user_no_token():
    db = MagicMock()
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(db, None)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_jwt_error():
    db = MagicMock()
    with patch("app.api.deps.jwt.decode", side_effect=JWTError):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(db, "bad-token")
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_no_sub():
    db = MagicMock()
    with patch("app.api.deps.jwt.decode", return_value={}): # No "sub" key
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(db, "valid-jwt")
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_not_found():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    
    with patch("app.api.deps.jwt.decode", return_value={"sub": "user-id"}):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(db, "valid-jwt")
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_locked():
    db = MagicMock()
    locked_user = User(id=uuid4(), is_locked=True)
    db.query.return_value.filter.return_value.first.return_value = locked_user
    
    with patch("app.api.deps.jwt.decode", return_value={"sub": str(locked_user.id)}):
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(db, "valid-jwt")
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.detail == "ACCOUNT_LOCKED"


def test_get_current_user_success():
    db = MagicMock()
    active_user = User(id=uuid4(), is_locked=False)
    db.query.return_value.filter.return_value.first.return_value = active_user
    
    with patch("app.api.deps.jwt.decode", return_value={"sub": str(active_user.id)}):
        user = get_current_user(db, "valid-jwt")
        assert user == active_user


def test_get_current_user_optional_no_token():
    db = MagicMock()
    assert get_current_user_optional(db, None) is None


def test_get_current_user_optional_jwt_error():
    db = MagicMock()
    with patch("app.api.deps.jwt.decode", side_effect=JWTError):
        assert get_current_user_optional(db, "bad-token") is None


def test_get_current_user_optional_no_sub():
    db = MagicMock()
    with patch("app.api.deps.jwt.decode", return_value={}):
        assert get_current_user_optional(db, "jwt") is None


def test_get_current_user_optional_locked():
    db = MagicMock()
    locked_user = User(id=uuid4(), is_locked=True)
    db.query.return_value.filter.return_value.first.return_value = locked_user
    
    with patch("app.api.deps.jwt.decode", return_value={"sub": str(locked_user.id)}):
        assert get_current_user_optional(db, "jwt") is None


def test_get_current_user_optional_success():
    db = MagicMock()
    active_user = User(id=uuid4(), is_locked=False)
    db.query.return_value.filter.return_value.first.return_value = active_user
    
    with patch("app.api.deps.jwt.decode", return_value={"sub": str(active_user.id)}):
        assert get_current_user_optional(db, "jwt") == active_user


def test_get_current_author_invalid_role():
    user = User(role="admin")
    with pytest.raises(HTTPException) as exc_info:
        get_current_author(user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_get_current_author_success():
    user = User(role="author")
    assert get_current_author(user) == user

    user_reader = User(role="reader")
    assert get_current_author(user_reader) == user_reader


def test_check_premium_access_free_chapter():
    chapter = Chapter(is_premium=False)
    # Should not raise exception
    check_premium_access(chapter, None)


def test_check_premium_access_no_user():
    chapter = Chapter(is_premium=True)
    with pytest.raises(HTTPException) as exc_info:
        check_premium_access(chapter, None)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_check_premium_access_expired_subscriber_naive():
    chapter = Chapter(is_premium=True)
    expired_user = User(
        premium_until=datetime.now(timezone.utc).replace(tzinfo=None)
        - timedelta(days=1)
    )
    
    with pytest.raises(HTTPException) as exc_info:
        check_premium_access(chapter, expired_user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_check_premium_access_expired_subscriber_aware():
    chapter = Chapter(is_premium=True)
    expired_user = User(premium_until=datetime.now(timezone.utc) - timedelta(days=1))
    
    with pytest.raises(HTTPException) as exc_info:
        check_premium_access(chapter, expired_user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_check_premium_access_active_subscriber_naive():
    chapter = Chapter(is_premium=True)
    active_user = User(
        premium_until=datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(days=1)
    )
    # Should pass
    check_premium_access(chapter, active_user)


def test_check_premium_access_active_subscriber_aware():
    chapter = Chapter(is_premium=True)
    active_user = User(premium_until=datetime.now(timezone.utc) + timedelta(days=1))
    # Should pass
    check_premium_access(chapter, active_user)


def test_check_premium_access_no_subscription():
    chapter = Chapter(is_premium=True)
    user = User(premium_until=None)
    
    with pytest.raises(HTTPException) as exc_info:
        check_premium_access(chapter, user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_require_role():
    user_admin = User(role="admin")
    user_reader = User(role="reader")
    
    check_admin = require_role("admin")
    
    # Should pass for admin
    assert check_admin(user_admin) == user_admin
    
    # Should raise for reader
    with pytest.raises(HTTPException) as exc_info:
        check_admin(user_reader)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


def test_require_authenticated_user_no_token():
    with pytest.raises(HTTPException) as exc_info:
        require_authenticated_user(None)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_require_authenticated_user_jwt_error():
    with patch("app.api.deps.jwt.decode", side_effect=JWTError):
        with pytest.raises(HTTPException) as exc_info:
            require_authenticated_user("bad-jwt")
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_require_authenticated_user_no_sub():
    with patch("app.api.deps.jwt.decode", return_value={}):
        with pytest.raises(HTTPException) as exc_info:
            require_authenticated_user("jwt")
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_require_authenticated_user_success():
    payload = {"sub": "user-123", "role": "reader"}
    with patch("app.api.deps.jwt.decode", return_value=payload):
        res = require_authenticated_user("jwt")
        assert res == payload
