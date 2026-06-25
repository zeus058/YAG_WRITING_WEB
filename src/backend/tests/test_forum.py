import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import status
from datetime import datetime, timezone
from uuid import uuid4

from app.main import app
from app.api import deps
from app.models.user import User
from app.models.forum import ForumPost, ForumReply, ForumPostLike
from app.models.profile import Profile

client = TestClient(app)


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_user():
    return User(
        id="d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd",
        username="test_author",
        email="author@yag.vn",
        role="author"
    )


@pytest.fixture(autouse=True)
def override_db(mock_db):
    def _override():
        yield mock_db
    app.dependency_overrides[deps.get_db] = _override
    yield
    app.dependency_overrides.pop(deps.get_db, None)


def test_get_forum_posts(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    post_id = uuid4()
    mock_post = ForumPost(
        id=post_id,
        user_id=mock_user.id,
        content="Test post content",
        likes_count=5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        replies=[],
        likes=[]
    )
    mock_post.user = mock_user

    mock_db.query.return_value.options.return_value.order_by.return_value.all.return_value = [mock_post]

    # Mock Profile search for authorName
    mock_profile = Profile(
        user_id=mock_user.id,
        display_name="Test Author Profile",
        avatar_url="avatar.jpg"
    )
    # The first query inside the loop finds the Profile
    mock_db.query.return_value.filter.return_value.first.return_value = mock_profile

    response = client.get("/api/v1/forum/posts", headers={"Authorization": "Bearer mock-token"})
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["content"] == "Test post content"
    assert data[0]["authorName"] == "Test Author Profile"

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_create_forum_post(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    mock_profile = Profile(
        user_id=mock_user.id,
        display_name="Test Author Profile",
        avatar_url="avatar.jpg"
    )
    mock_db.query.return_value.filter.return_value.first.return_value = mock_profile

    # Mock db.refresh to assign database-generated fields
    def mock_refresh(obj):
        obj.id = uuid4()
        obj.created_at = datetime.now(timezone.utc)
        obj.updated_at = datetime.now(timezone.utc)
    mock_db.refresh.side_effect = mock_refresh

    response = client.post(
        "/api/v1/forum/posts",
        json={"content": "New forum post!"},
        headers={"Authorization": "Bearer mock-token"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == "New forum post!"
    assert data["authorName"] == "Test Author Profile"
    assert mock_db.add.called
    assert mock_db.commit.called

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_like_forum_post(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    post_id = uuid4()
    mock_post = ForumPost(
        id=post_id,
        user_id=uuid4(),
        content="Some content",
        likes_count=0
    )
    mock_db.query.return_value.filter.return_value.first.side_effect = [mock_post, None]

    response = client.post(
        f"/api/v1/forum/posts/{post_id}/like",
        headers={"Authorization": "Bearer mock-token"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["liked"] is True
    assert data["likes"] == 1
    assert mock_db.commit.called

    app.dependency_overrides.pop(deps.get_current_user, None)


def test_reply_to_forum_post(mock_db, mock_user):
    app.dependency_overrides[deps.get_current_user] = lambda: mock_user

    post_id = uuid4()
    mock_post = ForumPost(
        id=post_id,
        user_id=uuid4(),
        content="Post to reply to",
        likes_count=0
    )
    mock_profile = Profile(
        user_id=mock_user.id,
        display_name="Reply Author Name",
        avatar_url=None
    )
    mock_db.query.return_value.filter.return_value.first.side_effect = [mock_post, mock_profile]

    # Mock db.refresh to assign database-generated fields
    def mock_refresh(obj):
        obj.id = uuid4()
        obj.created_at = datetime.now(timezone.utc)
        obj.updated_at = datetime.now(timezone.utc)
    mock_db.refresh.side_effect = mock_refresh

    response = client.post(
        f"/api/v1/forum/posts/{post_id}/replies",
        json={"content": "My reply to you"},
        headers={"Authorization": "Bearer mock-token"}
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["content"] == "My reply to you"
    assert data["display_name"] == "Reply Author Name"
    assert mock_db.add.called
    assert mock_db.commit.called

    app.dependency_overrides.pop(deps.get_current_user, None)
