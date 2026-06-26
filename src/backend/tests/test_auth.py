import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status
from datetime import datetime, timezone

from app.main import app
from app.api import deps
from app.models.user import User
from app.models.profile import Profile
from app.core.security import get_password_hash, verify_password

# Create a clean TestClient
client = TestClient(app)


@pytest.fixture
def mock_db():
    """Pytest fixture to generate a mock database session."""
    db = MagicMock()
    return db


@pytest.fixture(autouse=True)
def override_db_dependency(mock_db):
    """Automatically overrides FastAPI deps.get_db with the mock database session."""
    def _override():
        yield mock_db
    app.dependency_overrides[deps.get_db] = _override
    yield
    app.dependency_overrides.pop(deps.get_db, None)


@patch("app.services.auth_service.get_redis_client")
def test_register_user_success(mock_redis, mock_db):
    """Verifies that user registration succeeds and yields a VERIFICATION_PENDING response."""
    # Mock redis instance functions
    redis_instance = MagicMock()
    mock_redis.return_value = redis_instance

    # Setup mock returns: email and username queries both return None (not registered yet)
    mock_db.query.return_value.filter.return_value.first.return_value = None

    payload = {
        "username": "hien_test",
        "email": "hien@yag.vn",
        "password": "Password123!",
        "role": "reader"
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["message"] == "VERIFICATION_PENDING"
    assert data["email"] == "hien@yag.vn"
    assert mock_db.commit.called
    assert redis_instance.setex.called


def test_register_duplicate_email(mock_db):
    """Verifies that duplicate emails are gracefully rejected with a 409 EMAIL_EXISTS error."""
    # Setup mock returns: return an existing user on email query
    mock_user = User(username="existing", email="hien@yag.vn")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "username": "hien_test",
        "email": "hien@yag.vn",
        "password": "Password123!",
        "role": "reader"
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "EMAIL_EXISTS"


def test_register_duplicate_username(mock_db):
    """Verifies that duplicate usernames are gracefully rejected with a 400 USERNAME_EXISTS error."""
    # Setup mock returns: email query returns None, but username query returns an existing user
    mock_user = User(username="hien_test", email="other@yag.vn")

    # We override the .first() return values specifically
    # First query (email filter) returns None, second query (username filter) returns mock_user
    mock_db.query.return_value.filter.return_value.first.side_effect = [None, mock_user]

    payload = {
        "username": "hien_test",
        "email": "hien@yag.vn",
        "password": "Password123!",
        "role": "reader"
    }

    response = client.post("/api/v1/auth/register", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "USERNAME_EXISTS"


@patch("app.services.auth_service.get_redis_client")
def test_login_user_success(mock_redis, mock_db):
    """Verifies that valid login requests yield successful token responses."""
    # Mock redis instance functions
    redis_instance = MagicMock()
    redis_instance.get.return_value = None
    mock_redis.return_value = redis_instance

    hashed_pwd = get_password_hash("Password123!")
    mock_user = User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="hien_test",
        email="hien@yag.vn",
        password_hash=hashed_pwd,
        role="reader",
        email_verified_at=datetime.now(timezone.utc)
    )
    mock_user.profile = Profile(
        user_id=mock_user.id,
        display_name="Gia Hiển",
        reputation_score=87,
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "email": "hien@yag.vn",
        "password": "Password123!"
    }

    response = client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "hien@yag.vn"
    assert data["user"]["profile"]["reputation_score"] == 87


@patch("app.services.auth_service.get_redis_client")
def test_login_user_invalid_credentials(mock_redis, mock_db):
    """Verifies that invalid password logins are blocked with a 401 INVALID_CREDENTIALS error."""
    # Mock redis instance functions
    redis_instance = MagicMock()
    redis_instance.get.return_value = None
    mock_redis.return_value = redis_instance

    hashed_pwd = get_password_hash("CorrectPassword!")
    mock_user = User(
        username="hien_test",
        email="hien@yag.vn",
        password_hash=hashed_pwd,
        role="reader",
        email_verified_at=datetime.now(timezone.utc)
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "email": "hien@yag.vn",
        "password": "WrongPassword!"
    }

    response = client.post("/api/v1/auth/login", json=payload)

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "INVALID_CREDENTIALS"


@patch("app.services.auth_service.get_redis_client")
def test_password_reset_request_success(mock_redis, mock_db):
    """Verifies that reset request caches OTP in Redis and returns a success status message."""
    mock_user = User(username="hien_test", email="hien@yag.vn")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    # Mock redis instance setex function
    redis_instance = MagicMock()
    mock_redis.return_value = redis_instance

    payload = {"email": "hien@yag.vn"}

    response = client.post("/api/v1/auth/password-reset/request", json=payload)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Email khôi phục đã được gửi nếu tài khoản tồn tại"
    assert redis_instance.setex.called


@patch("app.services.auth_service.get_redis_client")
def test_password_reset_confirm_success(mock_redis, mock_db):
    """Verifies that valid OTP matching updates the user password in PostgreSQL."""
    mock_user = User(username="hien_test", email="hien@yag.vn", password_hash="old_hash")
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    # Mock redis returning the correct OTP
    redis_instance = MagicMock()
    redis_instance.get.return_value = "123456"
    mock_redis.return_value = redis_instance

    payload = {
        "email": "hien@yag.vn",
        "otp": "123456",
        "new_password": "NewSecretPassword123!"
    }

    response = client.post("/api/v1/auth/password-reset/confirm", json=payload)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Mật khẩu đã được cập nhật"
    assert mock_db.commit.called
    assert redis_instance.delete.called


@patch("app.services.auth_service.get_redis_client")
def test_password_reset_confirm_invalid_otp(mock_redis, mock_db):
    """Verifies that invalid OTP combinations are rejected with a 400 INVALID_OTP error."""
    # Mock redis returning a mismatching OTP
    redis_instance = MagicMock()
    redis_instance.get.return_value = "999999"
    mock_redis.return_value = redis_instance

    payload = {
        "email": "hien@yag.vn",
        "otp": "123456",
        "new_password": "NewSecretPassword123!"
    }

    response = client.post("/api/v1/auth/password-reset/confirm", json=payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "INVALID_OTP"


def test_change_password_success(mock_db):
    """Authenticated users can change password with their current password."""
    user = User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="hien_test",
        email="hien@yag.vn",
        password_hash=get_password_hash("OldPassword123!"),
        role="reader",
    )
    app.dependency_overrides[deps.get_current_user] = lambda: user

    response = client.post(
        "/api/v1/auth/password/change",
        json={"old_password": "OldPassword123!", "new_password": "NewPassword123!"},
    )

    app.dependency_overrides.pop(deps.get_current_user, None)

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Mật khẩu đã được cập nhật"
    assert mock_db.commit.called
    assert verify_password("NewPassword123!", user.password_hash)


@patch("app.services.auth_service.get_redis_client")
def test_login_user_unverified(mock_redis, mock_db):
    """Verifies that login fails if the email has not been verified yet."""
    redis_instance = MagicMock()
    redis_instance.get.return_value = None
    mock_redis.return_value = redis_instance

    hashed_pwd = get_password_hash("Password123!")
    mock_user = User(
        username="hien_test",
        email="hien@yag.vn",
        password_hash=hashed_pwd,
        role="reader",
        email_verified_at=None
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "email": "hien@yag.vn",
        "password": "Password123!"
    }

    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "EMAIL_NOT_VERIFIED"


@patch("app.services.auth_service.get_redis_client")
def test_verify_email_success(mock_redis, mock_db):
    """Verifies that verifying with correct OTP marks email as verified and returns TokenResponse."""
    redis_instance = MagicMock()
    redis_instance.get.return_value = "123456"
    mock_redis.return_value = redis_instance

    mock_user = User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="hien_test",
        email="hien@yag.vn",
        role="reader",
        email_verified_at=None
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "email": "hien@yag.vn",
        "otp": "123456"
    }

    response = client.post("/api/v1/auth/verify-email", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "hien@yag.vn"
    assert mock_db.commit.called
    assert redis_instance.delete.called


@patch("app.services.auth_service.get_redis_client")
def test_verify_email_invalid_otp(mock_redis, mock_db):
    """Verifies that verifying with incorrect OTP returns 400."""
    redis_instance = MagicMock()
    redis_instance.get.return_value = "999999"
    mock_redis.return_value = redis_instance

    mock_user = User(
        username="hien_test",
        email="hien@yag.vn",
        role="reader",
        email_verified_at=None
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {
        "email": "hien@yag.vn",
        "otp": "123456"
    }

    response = client.post("/api/v1/auth/verify-email", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "INVALID_OTP"


@patch("app.services.auth_service.get_redis_client")
def test_resend_verification_success(mock_redis, mock_db):
    """Verifies that requesting verification resend caches a new OTP and returns VERIFICATION_PENDING."""
    redis_instance = MagicMock()
    mock_redis.return_value = redis_instance

    mock_user = User(
        username="hien_test",
        email="hien@yag.vn",
        role="reader",
        email_verified_at=None
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {"email": "hien@yag.vn"}

    response = client.post("/api/v1/auth/resend-verification", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["message"] == "VERIFICATION_PENDING"
    assert data["email"] == "hien@yag.vn"
    assert redis_instance.setex.called


@patch("app.services.auth_service.get_redis_client")
def test_resend_verification_already_verified(mock_redis, mock_db):
    """Verifies that requesting resend for an already verified email returns 400."""
    redis_instance = MagicMock()
    mock_redis.return_value = redis_instance

    mock_user = User(
        username="hien_test",
        email="hien@yag.vn",
        role="reader",
        email_verified_at=datetime.now(timezone.utc)
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_user

    payload = {"email": "hien@yag.vn"}

    response = client.post("/api/v1/auth/resend-verification", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "EMAIL_ALREADY_VERIFIED"

