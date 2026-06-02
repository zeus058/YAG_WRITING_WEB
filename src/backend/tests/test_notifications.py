import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import status
from datetime import datetime, timezone
from uuid import uuid4

from app.main import app
from app.api import deps
from app.models.user import User
from app.models.notification import Notification

client = TestClient(app)

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_user():
    return User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="hien_test",
        email="hien@yag.vn",
        role="reader"
    )

@pytest.fixture(autouse=True)
def override_db(mock_db):
    def _override():
        yield mock_db
    app.dependency_overrides[deps.get_db] = _override
    yield
    app.dependency_overrides.pop(deps.get_db, None)


def test_list_notifications(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    mock_notification = Notification(
        id=uuid4(),
        user_id=mock_user.id,
        type="system",
        title="Test Title",
        message="Test message",
        payload=None,
        read_at=None,
        created_at=datetime.now(timezone.utc)
    )
    mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [mock_notification]

    response = client.get("/api/v1/notifications/", headers={"Authorization": "Bearer mock-token"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data["notifications"]) == 1
    assert data["notifications"][0]["title"] == "Test Title"

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_read_notification(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    notif_id = uuid4()
    mock_notification = Notification(
        id=notif_id,
        user_id=mock_user.id,
        type="system",
        title="Test Title",
        message="Test message",
        payload=None,
        read_at=None,
        created_at=datetime.now(timezone.utc)
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_notification

    response = client.post(f"/api/v1/notifications/{notif_id}/read", headers={"Authorization": "Bearer mock-token"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["read_at"] is not None
    assert mock_db.commit.called

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_read_all_notifications(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    mock_db.query.return_value.filter.return_value.update.return_value = 5

    response = client.post("/api/v1/notifications/read-all", headers={"Authorization": "Bearer mock-token"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "success"
    assert data["marked_read_count"] == 5

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_unread_count(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    mock_db.query.return_value.filter.return_value.count.return_value = 3

    response = client.get("/api/v1/notifications/unread-count", headers={"Authorization": "Bearer mock-token"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["unread_count"] == 3

    app.dependency_overrides.pop(deps.get_current_user, None)
