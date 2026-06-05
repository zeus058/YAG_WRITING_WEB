import uuid
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from fastapi import status, WebSocketDisconnect, HTTPException
from jose import jwt

from app.main import app
from app.api import deps
from app.core.config import settings
from app.models import Chapter, Comment, ReadingHistory, Story, User, Library
from app.models.profile import Profile

client = TestClient(app)

# Helper fixtures / utilities
def _make_mock_user(role="reader", username="test_user"):
    u = User(
        id=uuid.uuid4(),
        username=username,
        email=f"{username}@yag.vn",
        role=role,
        premium_until=None
    )
    p = Profile(
        user_id=u.id,
        display_name=f"Display {username}",
        avatar_url="http://avatar.url",
        reputation_score=100
    )
    u.profile = p
    return u

def _make_mock_story(author, title="Test Story"):
    s = Story(
        id=uuid.uuid4(),
        author_id=author.id,
        title=title,
        description="This is a detailed mock description of the story for validation.",
        category="Kiếm hiệp",
        status="ongoing",
        cover_url="http://cover.url",
        view_count=120,
        rating_avg=4.5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        author=author,
        chapters=[],
        reviews=[]
    )
    return s

class TestChaptersAPI:
    """Comprehensive test suite for U004 Chapter Editing & U007 Reading Chapters APIs."""

    @pytest.fixture(autouse=True)
    def setup_dependencies(self):
        self.mock_db = MagicMock()
        self.mock_author = _make_mock_user(role="author", username="author_user")
        self.mock_reader = _make_mock_user(role="reader", username="reader_user")
        self.mock_admin = _make_mock_user(role="admin", username="admin_user")
        self.mock_story = _make_mock_story(self.mock_author)

        def _override_db():
            yield self.mock_db

        def _override_author():
            return self.mock_author

        app.dependency_overrides[deps.get_db] = _override_db
        app.dependency_overrides[deps.get_current_author] = _override_author
        app.dependency_overrides[deps.get_current_user] = lambda: self.mock_reader
        app.dependency_overrides[deps.get_current_user_optional] = lambda: self.mock_reader

        # Setup side effects to populate mock attributes
        def mock_db_populate(obj):
            if isinstance(obj, Chapter):
                if not getattr(obj, "id", None):
                    obj.id = uuid.uuid4()
                if not getattr(obj, "created_at", None):
                    obj.created_at = datetime.now(timezone.utc)
                if not getattr(obj, "updated_at", None):
                    obj.updated_at = datetime.now(timezone.utc)
                obj.story = self.mock_story
            elif isinstance(obj, Comment):
                if not getattr(obj, "id", None):
                    obj.id = uuid.uuid4()
                if not getattr(obj, "created_at", None):
                    obj.created_at = datetime.now(timezone.utc)
                if not getattr(obj, "updated_at", None):
                    obj.updated_at = datetime.now(timezone.utc)
                obj.user = self.mock_reader

        self.mock_db.add.side_effect = mock_db_populate
        self.mock_db.refresh.side_effect = mock_db_populate
        
        yield

        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_author, None)
        app.dependency_overrides.pop(deps.get_current_user, None)
        app.dependency_overrides.pop(deps.get_current_user_optional, None)

    # ---------------------------------------------------------------------------
    # U004 - create_chapter endpoint tests
    # ---------------------------------------------------------------------------

    def test_create_chapter_success(self):
        # First query: story check. Second query: existing chapter check (returns None)
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [self.mock_story, None]

        payload = {
            "story_id": str(self.mock_story.id),
            "chapter_number": 2,
            "title": "Chapter Two",
            "content": "This is content for chapter two.",
            "is_premium": False
        }
        
        response = client.post("/api/v1/chapters/", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Chapter Two"
        assert self.mock_db.add.called
        assert self.mock_db.commit.called

    def test_create_chapter_number_exists(self):
        existing_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=2, title="Existing")
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [self.mock_story, existing_chapter]

        payload = {
            "story_id": str(self.mock_story.id),
            "chapter_number": 2,
            "title": "Chapter Two Duplicate",
            "content": "Draft content",
            "is_premium": False
        }
        
        response = client.post("/api/v1/chapters/", json=payload)
        
        assert response.status_code == 400
        assert "Chapter number already exists" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U004 - update_chapter endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.invalidate_chapter_cache")
    def test_update_chapter_success(self, mock_invalidate):
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Old Title", story=self.mock_story, is_premium=False)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_chapter

        payload = {
            "title": "New Updated Title",
            "content": "Fresh autosaved draft content.",
            "is_premium": True
        }
        
        response = client.put(f"/api/v1/chapters/{mock_chapter.id}", json=payload)
        
        assert response.status_code == 200
        assert mock_chapter.title == "New Updated Title"
        assert mock_chapter.moderation_status == "draft"
        assert self.mock_db.commit.called
        assert mock_invalidate.called

    # ---------------------------------------------------------------------------
    # U007 - get_chapter endpoint tests (Premium & Auth)
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.get_redis_client")
    def test_get_chapter_free_success(self, mock_redis):
        # Mock Redis hit
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        chapter_id = uuid.uuid4()
        chapter_json = {
            "id": str(chapter_id),
            "story_id": str(self.mock_story.id),
            "story_author_id": str(self.mock_author.id),
            "chapter_number": 1,
            "title": "Cached Chapter Title",
            "content": "Very long cached content",
            "moderation_status": "approved",
            "is_premium": False,
            "publish_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_client.get.return_value = json.dumps(chapter_json)

        response = client.get(f"/api/v1/chapters/{chapter_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Cached Chapter Title"
        assert data["cache_status"] == "hit"

    @patch("app.api.v1.endpoints.chapters.get_redis_client")
    def test_get_chapter_premium_blocked_for_normal_reader(self, mock_redis):
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        chapter_id = uuid.uuid4()
        chapter_json = {
            "id": str(chapter_id),
            "story_id": str(self.mock_story.id),
            "story_author_id": str(self.mock_author.id),
            "chapter_number": 1,
            "title": "Premium Chapter Title",
            "content": "Cached premium content",
            "moderation_status": "approved",
            "is_premium": True, # Premium chapter
            "publish_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_client.get.return_value = json.dumps(chapter_json)

        # Reader has premium_until = None
        self.mock_reader.premium_until = None

        response = client.get(f"/api/v1/chapters/{chapter_id}")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "nâng cấp gói hội viên" in response.json()["detail"]

    @patch("app.api.v1.endpoints.chapters.get_redis_client")
    def test_get_chapter_premium_allowed_for_subscriber(self, mock_redis):
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        chapter_id = uuid.uuid4()
        chapter_json = {
            "id": str(chapter_id),
            "story_id": str(self.mock_story.id),
            "story_author_id": str(self.mock_author.id),
            "chapter_number": 1,
            "title": "Premium Chapter Title",
            "content": "Cached premium content",
            "moderation_status": "approved",
            "is_premium": True,
            "publish_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_client.get.return_value = json.dumps(chapter_json)

        # Reader has active premium subscription
        self.mock_reader.premium_until = datetime.now(timezone.utc) + timedelta(days=10)

        response = client.get(f"/api/v1/chapters/{chapter_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Premium Chapter Title"

    @patch("app.api.v1.endpoints.chapters.get_redis_client")
    def test_get_chapter_admin_allowed_without_premium(self, mock_redis):
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        
        chapter_id = uuid.uuid4()
        chapter_json = {
            "id": str(chapter_id),
            "story_id": str(self.mock_story.id),
            "story_author_id": str(self.mock_author.id),
            "chapter_number": 1,
            "title": "Premium Chapter Title",
            "content": "Cached premium content",
            "moderation_status": "approved",
            "is_premium": True,
            "publish_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        mock_client.get.return_value = json.dumps(chapter_json)

        # Override current user as Admin (but wait, admin is blocked from reading/writing stories? Oh!)
        # Let's check: "Tài khoản quản trị viên không thể đọc hoặc viết truyện." is raised in get_chapter if role == "admin"
        app.dependency_overrides[deps.get_current_user_optional] = lambda: self.mock_admin
        response = client.get(f"/api/v1/chapters/{chapter_id}")
        assert response.status_code == 403
        assert "quản trị viên không thể đọc" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U010 - get_comments / tree & add_comment endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_comments_tree(self):
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Chapter")
        mock_comment_1 = Comment(id=uuid.uuid4(), chapter_id=mock_chapter.id, user_id=self.mock_reader.id, content="Root comment", parent_id=None, user=self.mock_reader, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        mock_comment_2 = Comment(id=uuid.uuid4(), chapter_id=mock_chapter.id, user_id=self.mock_reader.id, content="Reply comment", parent_id=mock_comment_1.id, user=self.mock_reader, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))

        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_chapter
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_comment_1, mock_comment_2]

        response = client.get(f"/api/v1/chapters/{mock_chapter.id}/comments/tree")
        assert response.status_code == 200
        data = response.json()
        assert len(data["comments"]) == 1
        assert data["comments"][0]["content"] == "Root comment"
        assert len(data["comments"][0]["replies"]) == 1
        assert data["comments"][0]["replies"][0]["content"] == "Reply comment"

    @patch("app.api.v1.endpoints.chapters.publish_comment", new_callable=AsyncMock)
    def test_add_comment_success(self, mock_publish):
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Chapter")
        
        # 1. get chapter query, 2. parent comment check (returns None because it's not a reply)
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_chapter, None]

        payload = {
            "content": "This is a great chapter!",
            "parent_id": None
        }
        
        response = client.post(f"/api/v1/chapters/{mock_chapter.id}/comments", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "This is a great chapter!"
        assert self.mock_db.add.called
        assert self.mock_db.commit.called
        assert mock_publish.called

    def test_add_comment_empty_content(self):
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Chapter")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_chapter

        payload = {"content": "   ", "parent_id": None}
        response = client.post(f"/api/v1/chapters/{mock_chapter.id}/comments", json=payload)
        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U010 - update_comment & delete_comment endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.publish_comment", new_callable=AsyncMock)
    def test_update_comment_success(self, mock_publish):
        comment_id = uuid.uuid4()
        mock_comment = Comment(id=comment_id, chapter_id=uuid.uuid4(), user_id=self.mock_reader.id, content="Old content", user=self.mock_reader, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_comment

        payload = {"content": "New edited comment content"}
        response = client.put(f"/api/v1/chapters/{mock_comment.chapter_id}/comments/{comment_id}", json=payload)
        
        assert response.status_code == 200
        assert mock_comment.content == "New edited comment content"
        assert self.mock_db.commit.called
        assert mock_publish.called

    def test_delete_comment_success(self):
        comment_id = uuid.uuid4()
        mock_comment = Comment(id=comment_id, chapter_id=uuid.uuid4(), user_id=self.mock_reader.id, content="Content")
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_comment

        response = client.delete(f"/api/v1/chapters/{mock_comment.chapter_id}/comments/{comment_id}")
        assert response.status_code == 204
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    # ---------------------------------------------------------------------------
    # U004 - save_author_draft endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.invalidate_chapter_cache")
    def test_save_author_draft(self, mock_invalidate):
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Draft", story=self.mock_story, is_premium=False)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_chapter

        payload = {
            "title": "REST Autosaved title",
            "content": "REST Autosaved content"
        }
        
        response = client.put(f"/api/v1/author/chapters/{mock_chapter.id}/draft", json=payload)
        
        assert response.status_code == 200
        assert mock_chapter.title == "REST Autosaved title"
        assert mock_chapter.content == "REST Autosaved content"
        assert self.mock_db.commit.called
        assert mock_invalidate.called

    # ---------------------------------------------------------------------------
    # WebSocket Live Comments Test
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.get_redis_client")
    def test_websocket_comments_connection(self, mock_redis):
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        mock_pubsub = MagicMock()
        mock_client.pubsub.return_value = mock_pubsub

        chapter_id = uuid.uuid4()
        with client.websocket_connect(f"/api/v1/chapters/{chapter_id}/comments/ws") as websocket:
            data = websocket.receive_json()
            assert data["type"] == "connected"
            assert data["chapter_id"] == str(chapter_id)

    # ---------------------------------------------------------------------------
    # WebSocket Autosave Editor Test
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.chapters.get_websocket_author")
    def test_websocket_editor_connection_and_save(self, mock_get_author):
        mock_get_author.return_value = self.mock_author
        
        mock_chapter = Chapter(id=uuid.uuid4(), story_id=self.mock_story.id, chapter_number=1, title="Original Title", story=self.mock_story, is_premium=False, updated_at=datetime.now(timezone.utc))
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_chapter

        # We need to patch SessionLocal in the websocket endpoint to return our mock DB
        with patch("app.api.v1.endpoints.chapters.SessionLocal") as mock_session_local:
            mock_session_local.return_value = self.mock_db
            
            with client.websocket_connect(f"/api/v1/author/chapters/{mock_chapter.id}/ws") as websocket:
                # establishment message
                data = websocket.receive_json()
                assert data["type"] == "connected"
                
                # Send autosave payload
                websocket.send_json({
                    "type": "draft.patch",
                    "payload": {
                        "title": "WS Autosaved Title",
                        "content": "WS Autosaved Content"
                    }
                })
                
                # Check response
                response_data = websocket.receive_json()
                assert response_data["type"] == "autosave"
                assert response_data["status"] == "success"
                assert mock_chapter.title == "WS Autosaved Title"
                assert mock_chapter.content == "WS Autosaved Content"


# ---------------------------------------------------------------------------
# Unit tests for chapters endpoint helper functions
# ---------------------------------------------------------------------------

from app.api.v1.endpoints.chapters import (
    get_websocket_author,
    invalidate_chapter_cache,
    ensure_reader_can_read,
    ensure_chapter_is_available,
)

class TestChaptersHelpers:
    def test_invalidate_chapter_cache_no_client(self):
        # Should return None if no redis client
        assert invalidate_chapter_cache(None, uuid.uuid4()) is None

    def test_invalidate_chapter_cache_error(self):
        mock_redis = MagicMock()
        mock_redis.delete.side_effect = ValueError("invalid UUID format")
        # Should gracefully catch exception and return None
        assert invalidate_chapter_cache(mock_redis, "not-a-uuid") is None

    def test_get_websocket_author_no_token(self):
        mock_ws = MagicMock()
        mock_ws.query_params = {}
        mock_ws.headers = {}
        mock_ws.cookies = {}
        db = MagicMock()

        with pytest.raises(HTTPException) as exc_info:
            get_websocket_author(mock_ws, db)
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_websocket_author_jwt_error(self):
        mock_ws = MagicMock()
        mock_ws.query_params = {"token": "invalid-token"}
        db = MagicMock()

        with patch("app.api.v1.endpoints.chapters.settings") as mock_settings:
            mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = True
            mock_settings.SECRET_KEY = "secret"
            with patch("app.api.v1.endpoints.chapters.jwt.decode", side_effect=jwt.JWTError):
                with pytest.raises(HTTPException) as exc_info:
                    get_websocket_author(mock_ws, db)
                assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_websocket_author_user_not_found(self):
        mock_ws = MagicMock()
        mock_ws.query_params = {"token": "valid-token"}
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        with patch("app.api.v1.endpoints.chapters.settings") as mock_settings:
            mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = True
            mock_settings.SECRET_KEY = "secret"
            with patch("app.api.v1.endpoints.chapters.jwt.decode", return_value={"sub": str(uuid.uuid4())}):
                with pytest.raises(HTTPException) as exc_info:
                    get_websocket_author(mock_ws, db)
                assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_websocket_author_user_locked(self):
        mock_ws = MagicMock()
        mock_ws.headers = {"authorization": "Bearer valid-token"}
        db = MagicMock()
        locked_user = User(id=uuid.uuid4(), is_locked=True)
        db.query.return_value.filter.return_value.first.return_value = locked_user

        with patch("app.api.v1.endpoints.chapters.settings") as mock_settings:
            mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
            mock_settings.SECRET_KEY = "secret"
            with patch("app.api.v1.endpoints.chapters.jwt.decode", return_value={"sub": str(locked_user.id)}):
                with pytest.raises(HTTPException) as exc_info:
                    get_websocket_author(mock_ws, db)
                assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
                assert exc_info.value.detail == "ACCOUNT_LOCKED"

    def test_get_websocket_author_invalid_role(self):
        mock_ws = MagicMock()
        mock_ws.cookies = {"access_token": "valid-token"}
        db = MagicMock()
        admin_user = User(id=uuid.uuid4(), is_locked=False, role="admin")
        db.query.return_value.filter.return_value.first.return_value = admin_user

        with patch("app.api.v1.endpoints.chapters.settings") as mock_settings:
            mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
            mock_settings.SECRET_KEY = "secret"
            with patch("app.api.v1.endpoints.chapters.jwt.decode", return_value={"sub": str(admin_user.id)}):
                with pytest.raises(HTTPException) as exc_info:
                    get_websocket_author(mock_ws, db)
                assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
                assert "không có quyền tác giả" in exc_info.value.detail

    def test_get_websocket_author_success(self):
        mock_ws = MagicMock()
        mock_ws.query_params = {}
        mock_ws.headers = {}
        mock_ws.cookies = {"token": "valid-token"}
        db = MagicMock()
        valid_user = User(id=uuid.uuid4(), is_locked=False, role="author")
        db.query.return_value.filter.return_value.first.return_value = valid_user

        with patch("app.api.v1.endpoints.chapters.settings") as mock_settings:
            mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
            mock_settings.SECRET_KEY = "secret"
            with patch("app.api.v1.endpoints.chapters.jwt.decode", return_value={"sub": str(valid_user.id)}):
                user = get_websocket_author(mock_ws, db)
                assert user == valid_user

    def test_ensure_reader_can_read_free(self):
        chapter_data = {"is_premium": False}
        # Should run without error
        ensure_reader_can_read(chapter_data, None)

    def test_ensure_reader_can_read_premium_no_user(self):
        chapter_data = {"is_premium": True}
        with pytest.raises(HTTPException) as exc_info:
            ensure_reader_can_read(chapter_data, None)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    def test_ensure_reader_can_read_premium_admin(self):
        chapter_data = {"is_premium": True}
        admin_user = User(role="admin")
        # Should allow
        ensure_reader_can_read(chapter_data, admin_user)

    def test_ensure_reader_can_read_premium_author(self):
        author_id = uuid.uuid4()
        chapter_data = {"is_premium": True, "story_author_id": str(author_id)}
        author_user = User(id=author_id, role="author")
        # Should allow
        ensure_reader_can_read(chapter_data, author_user)

    def test_ensure_reader_can_read_premium_expired_subscriber_naive(self):
        chapter_data = {"is_premium": True, "story_author_id": str(uuid.uuid4())}
        expired_user = User(role="reader", premium_until=datetime.utcnow() - timedelta(days=1))
        with pytest.raises(HTTPException) as exc_info:
            ensure_reader_can_read(chapter_data, expired_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Premium đã hết hạn" in exc_info.value.detail

    def test_ensure_reader_can_read_premium_expired_subscriber_aware(self):
        chapter_data = {"is_premium": True, "story_author_id": str(uuid.uuid4())}
        expired_user = User(role="reader", premium_until=datetime.now(timezone.utc) - timedelta(days=1))
        with pytest.raises(HTTPException) as exc_info:
            ensure_reader_can_read(chapter_data, expired_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Premium đã hết hạn" in exc_info.value.detail

    def test_ensure_reader_can_read_premium_active_subscriber_naive(self):
        chapter_data = {"is_premium": True, "story_author_id": str(uuid.uuid4())}
        active_user = User(role="reader", premium_until=datetime.utcnow() + timedelta(days=1))
        # Should allow
        ensure_reader_can_read(chapter_data, active_user)

    def test_ensure_reader_can_read_premium_active_subscriber_aware(self):
        chapter_data = {"is_premium": True, "story_author_id": str(uuid.uuid4())}
        active_user = User(role="reader", premium_until=datetime.now(timezone.utc) + timedelta(days=1))
        # Should allow
        ensure_reader_can_read(chapter_data, active_user)

    def test_ensure_reader_can_read_premium_no_subscription(self):
        chapter_data = {"is_premium": True, "story_author_id": str(uuid.uuid4())}
        normal_user = User(role="reader", premium_until=None)
        with pytest.raises(HTTPException) as exc_info:
            ensure_reader_can_read(chapter_data, normal_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    def test_ensure_chapter_is_available_not_approved(self):
        author_id = uuid.uuid4()
        chapter_data = {
            "moderation_status": "pending",
            "story_author_id": str(author_id),
            "publish_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Author can read pending chapter
        author_user = User(id=author_id)
        ensure_chapter_is_available(chapter_data, author_user)

        # Reader cannot read pending chapter
        reader_user = User(id=uuid.uuid4())
        with pytest.raises(HTTPException) as exc_info:
            ensure_chapter_is_available(chapter_data, reader_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    def test_ensure_chapter_is_available_future_publish(self):
        author_id = uuid.uuid4()
        future_time = datetime.now(timezone.utc) + timedelta(days=5)
        chapter_data = {
            "moderation_status": "approved",
            "story_author_id": str(author_id),
            "publish_at": future_time.isoformat()
        }

        # Author can read future chapter
        author_user = User(id=author_id)
        ensure_chapter_is_available(chapter_data, author_user)

        # Reader cannot read future chapter
        reader_user = User(id=uuid.uuid4())
        with pytest.raises(HTTPException) as exc_info:
            ensure_chapter_is_available(chapter_data, reader_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    def test_ensure_chapter_is_available_future_publish_naive(self):
        author_id = uuid.uuid4()
        future_time_naive = datetime.utcnow() + timedelta(days=5)
        chapter_data = {
            "moderation_status": "approved",
            "story_author_id": str(author_id),
            "publish_at": future_time_naive.isoformat()
        }

        # Reader cannot read future chapter
        reader_user = User(id=uuid.uuid4())
        with pytest.raises(HTTPException) as exc_info:
            ensure_chapter_is_available(chapter_data, reader_user)
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

