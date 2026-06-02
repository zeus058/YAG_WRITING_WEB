import io
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.api import deps
from app.models.user import User
from app.models.profile import Profile

# Create test client
client = TestClient(app)

@pytest.fixture
def mock_db():
    """Generates a mock database session."""
    return MagicMock()

@pytest.fixture
def mock_user():
    """Generates an authenticated mock User."""
    return User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="hien_test",
        email="hien@yag.vn",
        role="reader"
    )

@pytest.fixture(autouse=True)
def override_db(mock_db):
    """Automatically overrides deps.get_db with mock database session."""
    def _override():
        yield mock_db
    app.dependency_overrides[deps.get_db] = _override
    yield
    app.dependency_overrides.pop(deps.get_db, None)

def test_update_profile_success(mock_db, mock_user):
    """Verifies that an authorized user can successfully edit display name and biography."""
    # Override get_current_user dependency injection
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    mock_profile = Profile(
        user_id=mock_user.id,
        display_name="hien_test",
        bio="Old bio",
        reputation_score=100
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_profile

    payload = {
        "display_name": "Gia Hiển",
        "bio": "Bút danh viết truyện mới"
    }

    # Simulate request with bearer auth token
    response = client.put(
        "/api/v1/auth/profiles/me",
        json=payload,
        headers={"Authorization": "Bearer mock-token-value"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["display_name"] == "Gia Hiển"
    assert data["bio"] == "Bút danh viết truyện mới"
    assert mock_db.commit.called
    
    # Clean overrides
    app.dependency_overrides.pop(deps.get_current_user, None)

def test_update_profile_unauthorized(mock_db):
    """Verifies that update profile requests are blocked with a 401 status when not authenticated."""
    # Do not override get_current_user - it will use actual logic and throw 401 since token is missing
    payload = {
        "display_name": "New Name",
        "bio": "New Bio"
    }
    
    response = client.put("/api/v1/auth/profiles/me", json=payload)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "INVALID_OR_EXPIRED_TOKEN"

@patch("app.api.v1.endpoints.auth.CloudinaryService.upload_avatar")
def test_upload_avatar_success(mock_upload, mock_db, mock_user):
    """Verifies that uploading a valid small image successfully writes the avatar_url to the database."""
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user
    
    # Mock Cloudinary return URL
    mock_upload.return_value = "https://res.cloudinary.com/yag/image/upload/v1/yag/avatars/avatar.webp"

    mock_profile = Profile(
        user_id=mock_user.id,
        display_name="hien_test",
        avatar_url=None,
        reputation_score=100
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_profile

    # Generate a tiny binary PNG in memory
    file_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01..."
    files = {"file": ("avatar.png", io.BytesIO(file_content), "image/png")}

    response = client.post(
        "/api/v1/auth/profiles/avatar",
        files=files,
        headers={"Authorization": "Bearer mock-token-value"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["avatar_url"] == "https://res.cloudinary.com/yag/image/upload/v1/yag/avatars/avatar.webp"
    assert mock_db.commit.called
    
    app.dependency_overrides.pop(deps.get_current_user, None)

def test_upload_avatar_invalid_format(mock_db, mock_user):
    """Verifies that non-image formats (e.g. plain text files) are blocked with a 400 INVALID_IMAGE_FORMAT error."""
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    files = {"file": ("document.txt", io.BytesIO(b"Hello World"), "text/plain")}

    response = client.post(
        "/api/v1/auth/profiles/avatar",
        files=files,
        headers={"Authorization": "Bearer mock-token-value"}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "INVALID_IMAGE_FORMAT"
    
    app.dependency_overrides.pop(deps.get_current_user, None)

def test_upload_avatar_too_large(mock_db, mock_user):
    """Verifies that files exceeding 2MB size constraints are blocked with an IMAGE_TOO_LARGE error."""
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    # Generate content larger than 2MB
    large_content = b"0" * (2 * 1024 * 1024 + 100)
    files = {"file": ("large_image.png", io.BytesIO(large_content), "image/png")}

    response = client.post(
        "/api/v1/auth/profiles/avatar",
        files=files,
        headers={"Authorization": "Bearer mock-token-value"}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "IMAGE_TOO_LARGE"
    
    app.dependency_overrides.pop(deps.get_current_user, None)
