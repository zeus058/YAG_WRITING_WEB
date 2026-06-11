import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.api import deps
from app.models import Story, User, Chapter, Library, Review
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

def _make_mock_story(author, title="Test Story", category="fantasy", story_status="ongoing"):
    s = Story(
        id=uuid.uuid4(),
        author_id=author.id,
        title=title,
        description="This is a detailed mock description of the story for validation.",
        category=category,
        status=story_status,
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

class TestStoriesAPI:
    """Comprehensive test suite for U003 Story Management & U007 Story Discovery APIs."""

    @pytest.fixture(autouse=True)
    def setup_dependencies(self):
        self.mock_db = MagicMock()
        self.mock_author = _make_mock_user(role="author", username="author_user")
        self.mock_reader = _make_mock_user(role="reader", username="reader_user")
        self.mock_admin = _make_mock_user(role="admin", username="admin_user")

        def _override_db():
            yield self.mock_db

        def _override_author():
            return self.mock_author

        app.dependency_overrides[deps.get_db] = _override_db
        app.dependency_overrides[deps.get_current_author] = _override_author
        app.dependency_overrides[deps.get_current_user] = _override_author

        # Setup side effects to populate mock attributes on commit/refresh/add
        def mock_db_populate(obj):
            if isinstance(obj, Story):
                if not getattr(obj, "id", None):
                    obj.id = uuid.uuid4()
                if getattr(obj, "view_count", None) is None:
                    obj.view_count = 0
                if getattr(obj, "rating_avg", None) is None:
                    obj.rating_avg = 0.0
                if not getattr(obj, "created_at", None):
                    obj.created_at = datetime.now(timezone.utc)
                if not getattr(obj, "updated_at", None):
                    obj.updated_at = datetime.now(timezone.utc)
                if not getattr(obj, "author", None):
                    obj.author = self.mock_author
                obj.chapters = []
                obj.reviews = []
            elif isinstance(obj, Review):
                if not getattr(obj, "id", None):
                    obj.id = uuid.uuid4()
                if not getattr(obj, "created_at", None):
                    obj.created_at = datetime.now(timezone.utc)
                if not getattr(obj, "updated_at", None):
                    obj.updated_at = datetime.now(timezone.utc)
                if not getattr(obj, "user", None):
                    obj.user = self.mock_author

        self.mock_db.add.side_effect = mock_db_populate
        self.mock_db.refresh.side_effect = mock_db_populate
        
        yield

        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_author, None)
        app.dependency_overrides.pop(deps.get_current_user, None)

    # ---------------------------------------------------------------------------
    # U003 - create_story endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.stories.upload_story_cover_to_cloudinary")
    @patch("app.api.v1.endpoints.stories.sync_story_embedding", new_callable=AsyncMock)
    def test_create_story_success(self, mock_sync, mock_upload):
        mock_upload.return_value = "http://cloudinary.url/cover.jpg"
        
        # Mock title check returning None (not existing)
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        # Prepare form data
        data = {
            "title": "A Brand New Novel",
            "description": "This is a detailed mock description of the story for validation.",
            "category": "Tiên hiệp",
            "status": "ongoing"
        }
        
        response = client.post(
            "/api/v1/stories/",
            data=data,
            files={"cover_file": ("cover.jpg", b"fakeimagebytes", "image/jpeg")}
        )
        
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["title"] == "A Brand New Novel"
        assert self.mock_db.add.called
        assert self.mock_db.commit.called
        assert mock_sync.called

    def test_create_story_title_already_exists(self):
        # Mock title check returning an existing story
        existing_story = _make_mock_story(self.mock_author, title="A Brand New Novel")
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_story

        data = {
            "title": "A Brand New Novel",
            "description": "This is a detailed mock description of the story for validation.",
            "category": "Tiên hiệp",
            "status": "ongoing"
        }
        
        response = client.post("/api/v1/stories/", data=data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already exists" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U007 - list_stories endpoint tests
    # ---------------------------------------------------------------------------

    def test_list_stories_filters(self):
        mock_story_1 = _make_mock_story(self.mock_author, title="Sword Art", category="fantasy", story_status="ongoing")
        mock_story_2 = _make_mock_story(self.mock_author, title="Blade Dance", category="action", story_status="completed")

        # Mock list queries
        mock_query = self.mock_db.query.return_value.options.return_value
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_story_1, mock_story_2]

        response = client.get("/api/v1/stories/?category=fantasy&status=ongoing&q=Sword")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Sword Art"

    # ---------------------------------------------------------------------------
    # U003 - get_my_stories endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_my_stories(self):
        mock_story = _make_mock_story(self.mock_author, title="My Own Tale")
        
        # Mock DB query
        mock_query = self.mock_db.query.return_value.options.return_value
        mock_query.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_story]

        response = client.get("/api/v1/stories/my-stories")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "My Own Tale"

    # ---------------------------------------------------------------------------
    # U003 - get_author_chapters endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_author_chapters_success(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_chapter = Chapter(
            id=uuid.uuid4(),
            story_id=mock_story.id,
            chapter_number=1,
            title="Chapter One",
            content="Some mock text that represents the actual content of the chapter.",
            moderation_status="draft",
            is_premium=False,
            publish_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Mock story retrieval & chapter retrieval
        # First query gets story, second gets chapters
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_chapter]

        response = client.get(f"/api/v1/stories/author/{mock_story.id}/chapters")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Chapter One"

    def test_get_author_chapters_unauthorized(self):
        other_author = _make_mock_user(role="author", username="other_author")
        mock_story = _make_mock_story(other_author) # story owned by other author
        
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story

        response = client.get(f"/api/v1/stories/author/{mock_story.id}/chapters")
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Not authorized" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U007 - get_story_detail endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_story_detail_success(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_chapter = Chapter(
            id=uuid.uuid4(),
            story_id=mock_story.id,
            chapter_number=1,
            title="Chapter One",
            content="Some mock text that represents the actual content of the chapter.",
            moderation_status="approved",
            is_premium=False,
            publish_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # First query gets story, second gets approved chapters
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_chapter]

        response = client.get(f"/api/v1/stories/{mock_story.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == mock_story.title
        assert len(data["chapters"]) == 1
        assert data["chapters"][0]["title"] == "Chapter One"

    def test_get_story_detail_not_found(self):
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.get(f"/api/v1/stories/{uuid.uuid4()}")
        assert response.status_code == 404

    # ---------------------------------------------------------------------------
    # U007 - toggle_bookmark endpoint tests
    # ---------------------------------------------------------------------------

    def test_toggle_bookmark_add(self):
        mock_story = _make_mock_story(self.mock_author)
        
        # Mock story exists, but no bookmark exists in Library
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        response = client.post(f"/api/v1/stories/{mock_story.id}/bookmark")
        assert response.status_code == 200
        data = response.json()
        assert data["bookmarked"] is True
        assert "added to library" in data["message"]
        assert self.mock_db.add.called
        assert self.mock_db.commit.called

    def test_toggle_bookmark_remove(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_bookmark = Library(user_id=self.mock_author.id, story_id=mock_story.id)

        # Mock story exists, and bookmark exists
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, mock_bookmark]

        response = client.post(f"/api/v1/stories/{mock_story.id}/bookmark")
        assert response.status_code == 200
        data = response.json()
        assert data["bookmarked"] is False
        assert "removed from library" in data["message"]
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    def test_toggle_bookmark_admin_forbidden(self):
        app.dependency_overrides[deps.get_current_user] = lambda: self.mock_admin
        response = client.post(f"/api/v1/stories/{uuid.uuid4()}/bookmark")
        assert response.status_code == 403
        assert "Tài khoản quản trị viên không thể thực hiện hành động này." in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U007 - get_my_library endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_my_library_success(self):
        mock_story = _make_mock_story(self.mock_author)
        
        # Mock DB query
        mock_query = self.mock_db.query.return_value.join.return_value
        mock_query.filter.return_value.order_by.return_value.all.return_value = [mock_story]

        response = client.get("/api/v1/stories/library/me")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == mock_story.title

    def test_get_my_library_admin_forbidden(self):
        app.dependency_overrides[deps.get_current_user] = lambda: self.mock_admin
        response = client.get("/api/v1/stories/library/me")
        assert response.status_code == 403

    # ---------------------------------------------------------------------------
    # U010 - review endpoint tests
    # ---------------------------------------------------------------------------

    def test_submit_review_new(self):
        mock_story = _make_mock_story(self.mock_author)
        
        # Mock: 1. story check returns mock_story, 2. review check returns None, 3. average rating return 4.8
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]
        self.mock_db.query.return_value.filter.return_value.scalar.return_value = 4.8

        payload = {"rating": 5, "content": "A stellar read!"}
        response = client.post(f"/api/v1/stories/{mock_story.id}/reviews", json=payload)
        
        assert response.status_code == 200
        res_data = response.json()
        assert res_data["rating"] == 5
        assert res_data["content"] == "A stellar read!"
        assert mock_story.rating_avg == 4.8
        assert self.mock_db.add.called
        assert self.mock_db.commit.called

    def test_submit_review_update(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_review = Review(
            id=uuid.uuid4(),
            user_id=self.mock_author.id,
            story_id=mock_story.id,
            rating=4,
            content="Pretty good",
            user=self.mock_author,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Mock: 1. story check, 2. review check returns existing review, 3. average rating
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, mock_review]
        self.mock_db.query.return_value.filter.return_value.scalar.return_value = 4.2

        payload = {"rating": 5, "content": "Updated: actually flawless"}
        response = client.post(f"/api/v1/stories/{mock_story.id}/reviews", json=payload)
        
        assert response.status_code == 200
        assert mock_review.rating == 5
        assert mock_review.content == "Updated: actually flawless"
        assert self.mock_db.commit.called

    def test_get_reviews(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_review = Review(
            id=uuid.uuid4(),
            user_id=self.mock_reader.id,
            story_id=mock_story.id,
            rating=5,
            content="Loved it!",
            user=self.mock_reader,
            created_at=datetime.now(timezone.utc)
        )

        # Mock: story check, then reviews list query
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_review]

        response = client.get(f"/api/v1/stories/{mock_story.id}/reviews")
        assert response.status_code == 200
        data = response.json()
        assert len(data["reviews"]) == 1
        assert data["reviews"][0]["content"] == "Loved it!"

    def test_update_my_review_success(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_review = Review(
            id=uuid.uuid4(),
            user_id=self.mock_author.id,
            story_id=mock_story.id,
            rating=3,
            content="Average",
            user=self.mock_author,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Mock: story check, review check, then rating scalar
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, mock_review]
        self.mock_db.query.return_value.filter.return_value.scalar.return_value = 4.0

        payload = {"rating": 4, "content": "Better than I thought"}
        response = client.put(f"/api/v1/stories/{mock_story.id}/reviews/me", json=payload)
        
        assert response.status_code == 200
        assert mock_review.rating == 4
        assert mock_review.content == "Better than I thought"
        assert self.mock_db.commit.called

    def test_update_my_review_not_found(self):
        mock_story = _make_mock_story(self.mock_author)
        
        # Mock story exists, but review not found
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        payload = {"rating": 4, "content": "N/A"}
        response = client.put(f"/api/v1/stories/{mock_story.id}/reviews/me", json=payload)
        assert response.status_code == 404

    def test_delete_my_review_success(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_review = Review(
            id=uuid.uuid4(),
            user_id=self.mock_author.id,
            story_id=mock_story.id,
            rating=3,
            content="Average",
            user=self.mock_author,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Mock story exists, review exists, and rating scalar after delete
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, mock_review]
        self.mock_db.query.return_value.filter.return_value.scalar.return_value = 0.0

        response = client.delete(f"/api/v1/stories/{mock_story.id}/reviews/me")
        assert response.status_code == 200
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    # ---------------------------------------------------------------------------
    # U003 - update_story endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.stories.upload_story_cover_to_cloudinary")
    @patch("app.api.v1.endpoints.stories.sync_story_embedding", new_callable=AsyncMock)
    def test_update_story_form_success(self, mock_sync, mock_upload):
        mock_story = _make_mock_story(self.mock_author)
        mock_upload.return_value = "http://cloudinary.url/new_cover.jpg"

        # Mock: 1. story retrieval, 2. duplicate title check returns None
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        data = {"title": "Updated Story Title", "description": "This is a detailed mock description of the story for validation."}
        response = client.put(
            f"/api/v1/stories/{mock_story.id}",
            data=data,
            files={"cover_file": ("new_cover.jpg", b"fakeimage", "image/jpeg")}
        )
        
        assert response.status_code == 200
        assert mock_story.title == "Updated Story Title"
        assert mock_story.cover_url == "http://cloudinary.url/new_cover.jpg"
        assert self.mock_db.commit.called
        assert mock_sync.called

    def test_update_story_json_success(self):
        mock_story = _make_mock_story(self.mock_author)

        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        payload = {"category": "Action"}
        response = client.put(
            f"/api/v1/stories/{mock_story.id}",
            json=payload
        )
        
        assert response.status_code == 200
        assert mock_story.category == "Action"

    def test_update_story_unauthorized(self):
        other_author = _make_mock_user(role="author", username="other_author")
        mock_story = _make_mock_story(other_author)

        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story

        response = client.put(
            f"/api/v1/stories/{mock_story.id}",
            json={"title": "Hack"}
        )
        assert response.status_code == 403

    def test_update_story_duplicate_title(self):
        mock_story = _make_mock_story(self.mock_author, title="My Story")
        another_story = _make_mock_story(self.mock_author, title="Duplicate Title")

        # Mock: 1. story retrieval, 2. title check returns other existing story
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, another_story]

        response = client.put(
            f"/api/v1/stories/{mock_story.id}",
            json={"title": "Duplicate Title"}
        )
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_update_story_no_fields(self):
        mock_story = _make_mock_story(self.mock_author)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story

        response = client.put(
            f"/api/v1/stories/{mock_story.id}",
            json={}
        )
        assert response.status_code == 400
        assert "No story fields provided" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # U007 - get_public_chapters endpoint tests
    # ---------------------------------------------------------------------------

    def test_get_public_chapters(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_chapter = Chapter(
            id=uuid.uuid4(),
            story_id=mock_story.id,
            chapter_number=1,
            title="Public Chap",
            content="Some mock text that represents the actual content of the chapter.",
            moderation_status="approved",
            is_premium=False,
            publish_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        # Mock story retrieval, then public chapters query
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_chapter]

        response = client.get(f"/api/v1/stories/{mock_story.id}/chapters")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Public Chap"

    # ---------------------------------------------------------------------------
    # U008 - semantic_search endpoint tests
    # ---------------------------------------------------------------------------

    @patch("app.api.v1.endpoints.stories.search_stories_semantic")
    def test_semantic_search_success(self, mock_search):
        from app.schemas.ai import AISemanticSearchResponse
        
        mock_result = AISemanticSearchResponse(
            query="test query",
            results=[
                {
                    "story_id": str(uuid.uuid4()),
                    "title": "Matched Story",
                    "plot_summary": "Matching plot",
                    "distance": 0.15,
                    "similarity": 0.85
                }
            ],
            count=1
        )
        mock_search.return_value = mock_result

        payload = {"query": "seeking action story", "limit": 5}
        response = client.post("/api/v1/stories/search", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Matched Story"

    # ---------------------------------------------------------------------------
    # U003 - delete_story endpoint tests
    # ---------------------------------------------------------------------------

    def test_delete_story_success(self):
        mock_story = _make_mock_story(self.mock_author)
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        response = client.delete(f"/api/v1/stories/{mock_story.id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Story deleted successfully"
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    def test_delete_story_admin_success(self):
        app.dependency_overrides[deps.get_current_user] = lambda: self.mock_admin
        mock_story = _make_mock_story(self.mock_author) # Owned by author
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, None]

        response = client.delete(f"/api/v1/stories/{mock_story.id}")
        assert response.status_code == 200
        assert response.json()["message"] == "Story deleted successfully"
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    def test_delete_story_pending_chapters_fails(self):
        mock_story = _make_mock_story(self.mock_author)
        mock_pending_chapter = Chapter(
            id=uuid.uuid4(),
            story_id=mock_story.id,
            chapter_number=1,
            title="Draft Chapter",
            content="Testing pending check",
            moderation_status="pending",
        )
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [mock_story, mock_pending_chapter]

        response = client.delete(f"/api/v1/stories/{mock_story.id}")
        assert response.status_code == 400
        assert "Không thể xóa truyện khi đang có chương chờ duyệt." in response.json()["detail"]

    def test_delete_story_unauthorized(self):
        other_author = _make_mock_user(role="author", username="other_author")
        mock_story = _make_mock_story(other_author) # Owned by other author
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story

        response = client.delete(f"/api/v1/stories/{mock_story.id}")
        assert response.status_code == 403
        assert "Not authorized to delete" in response.json()["detail"]

    # ---------------------------------------------------------------------------
    # Test Story Visibility Restrictions (No published chapters)
    # ---------------------------------------------------------------------------

    def test_get_story_detail_without_chapters_anonymous_404(self):
        app.dependency_overrides[deps.get_current_user_optional] = lambda: None
        mock_story = _make_mock_story(self.mock_author)
        # First query gets story, second gets approved chapters (empty list)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        try:
            response = client.get(f"/api/v1/stories/{mock_story.id}")
            assert response.status_code == status.HTTP_404_NOT_FOUND
            assert "Story not found or not yet published" in response.json()["detail"]
        finally:
            app.dependency_overrides.pop(deps.get_current_user_optional, None)

    def test_get_story_detail_without_chapters_author_success(self):
        app.dependency_overrides[deps.get_current_user_optional] = lambda: self.mock_author
        mock_story = _make_mock_story(self.mock_author)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        try:
            response = client.get(f"/api/v1/stories/{mock_story.id}")
            assert response.status_code == 200
            assert response.json()["title"] == mock_story.title
        finally:
            app.dependency_overrides.pop(deps.get_current_user_optional, None)

    def test_get_public_chapters_without_chapters_anonymous_404(self):
        app.dependency_overrides[deps.get_current_user_optional] = lambda: None
        mock_story = _make_mock_story(self.mock_author)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []

        try:
            response = client.get(f"/api/v1/stories/{mock_story.id}/chapters")
            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.pop(deps.get_current_user_optional, None)
