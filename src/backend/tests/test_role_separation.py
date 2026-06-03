import pytest
import uuid
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.api import deps
from app.models import User, Chapter, Story, Library, Review

client = TestClient(app)

@pytest.fixture
def mock_db():
    db = MagicMock()
    return db

@pytest.fixture(autouse=True)
def override_db_dependency(mock_db):
    app.dependency_overrides[deps.get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(deps.get_db, None)

def test_admin_blocked_from_author_dependency():
    """Verifies that an admin user is rejected from get_current_author."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    with pytest.raises(Exception) as exc_info:
        deps.get_current_author(admin_user)
    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản không có quyền truy cập không gian tác giả" in exc_info.value.detail

def test_admin_blocked_from_reading_chapter(mock_db):
    """Verifies that admin cannot read story chapters."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    app.dependency_overrides[deps.get_current_user_optional] = lambda: admin_user
    
    chapter_id = uuid.uuid4()
    response = client.get(f"/api/v1/chapters/{chapter_id}")
    
    app.dependency_overrides.pop(deps.get_current_user_optional, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản quản trị viên không thể đọc hoặc viết truyện." in response.json()["detail"]

def test_admin_blocked_from_adding_comment(mock_db):
    """Verifies that admin cannot write comments."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    app.dependency_overrides[deps.get_current_user] = lambda: admin_user
    
    chapter_id = uuid.uuid4()
    response = client.post(f"/api/v1/chapters/{chapter_id}/comments", json={"content": "Nice story!"})
    
    app.dependency_overrides.pop(deps.get_current_user, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản quản trị viên không thể bình luận." in response.json()["detail"]

def test_admin_blocked_from_bookmarking_story(mock_db):
    """Verifies that admin cannot bookmark stories."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    app.dependency_overrides[deps.get_current_user] = lambda: admin_user
    
    # Mock story exists
    mock_db.query.return_value.filter.return_value.first.return_value = Story(id=uuid.uuid4())
    
    story_id = uuid.uuid4()
    response = client.post(f"/api/v1/stories/{story_id}/bookmark")
    
    app.dependency_overrides.pop(deps.get_current_user, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản quản trị viên không thể thực hiện hành động này." in response.json()["detail"]

def test_admin_blocked_from_submitting_review(mock_db):
    """Verifies that admin cannot review stories."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    app.dependency_overrides[deps.get_current_user] = lambda: admin_user
    
    # Mock story exists
    mock_db.query.return_value.filter.return_value.first.return_value = Story(id=uuid.uuid4())
    
    story_id = uuid.uuid4()
    response = client.post(f"/api/v1/stories/{story_id}/reviews", json={"rating": 5, "content": "Superb"})
    
    app.dependency_overrides.pop(deps.get_current_user, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản quản trị viên không thể đánh giá truyện." in response.json()["detail"]

def test_admin_blocked_from_membership_checkout(mock_db):
    """Verifies that admin cannot buy memberships."""
    admin_user = User(
        id=uuid.uuid4(),
        username="admin",
        role="admin"
    )
    app.dependency_overrides[deps.get_current_user] = lambda: admin_user
    
    response = client.post("/api/v1/membership/checkout", json={"plan_id": "MONTHLY", "return_url": "http://localhost/result"})
    
    app.dependency_overrides.pop(deps.get_current_user, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Tài khoản quản trị viên không thể thực hiện giao dịch thanh toán." in response.json()["detail"]

def test_reader_blocked_from_admin_stats(mock_db):
    """Verifies that a normal reader cannot view admin stats."""
    reader_user = User(
        id=uuid.uuid4(),
        username="reader",
        role="reader"
    )
    app.dependency_overrides[deps.get_current_user] = lambda: reader_user
    
    response = client.get("/api/v1/admin/stats")
    
    app.dependency_overrides.pop(deps.get_current_user, None)
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "ADMIN_REQUIRED" in response.json()["detail"]
