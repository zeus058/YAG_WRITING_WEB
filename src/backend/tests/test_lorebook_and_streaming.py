import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.api import deps
from app.models import Story, User
from app.models.profile import Profile
from app.models.lore_item import StoryLore
from app.core.config import settings

client = TestClient(app)

def _make_mock_user(role="author", username="test_author"):
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
        description="A story description.",
        category="fantasy",
        status="ongoing",
        cover_url="http://cover.url",
        view_count=120,
        rating_avg=4.5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        author=author
    )
    return s

class TestLorebookAndStreaming:
    @pytest.fixture(autouse=True)
    def setup_dependencies(self):
        self.mock_db = MagicMock()
        self.mock_author = _make_mock_user(role="author", username="author_user")
        self.mock_story = _make_mock_story(self.mock_author)

        def _override_db():
            yield self.mock_db

        def _override_author():
            return self.mock_author

        app.dependency_overrides[deps.get_db] = _override_db
        app.dependency_overrides[deps.get_current_author] = _override_author
        app.dependency_overrides[deps.require_author_role] = _override_author
        app.dependency_overrides[deps.get_current_user] = _override_author

        def mock_db_populate(obj):
            if isinstance(obj, StoryLore):
                if not getattr(obj, "id", None):
                    obj.id = uuid.uuid4()
                if not getattr(obj, "created_at", None):
                    obj.created_at = datetime.now(timezone.utc)
                if not getattr(obj, "updated_at", None):
                    obj.updated_at = datetime.now(timezone.utc)

        self.mock_db.add.side_effect = mock_db_populate
        self.mock_db.refresh.side_effect = mock_db_populate

        yield

        app.dependency_overrides.clear()

    def test_list_lores_success(self):
        mock_lore = StoryLore(
            id=uuid.uuid4(),
            story_id=self.mock_story.id,
            entity_name="Tiêu Viêm",
            entity_type="character",
            description="Nhân vật chính"
        )
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_story
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_lore]

        response = client.get(f"/api/v1/stories/{self.mock_story.id}/lores")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["entity_name"] == "Tiêu Viêm"

    def test_list_lores_forbidden(self):
        other_author = _make_mock_user(role="author", username="other_author")
        other_story = _make_mock_story(other_author)
        self.mock_db.query.return_value.filter.return_value.first.return_value = other_story

        response = client.get(f"/api/v1/stories/{other_story.id}/lores")
        assert response.status_code == 403

    def test_create_lore_success(self):
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_story
        
        payload = {
            "entity_name": "Tiêu Viêm",
            "entity_type": "character",
            "description": "Nhân vật chính"
        }
        response = client.post(f"/api/v1/stories/{self.mock_story.id}/lores", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["entity_name"] == "Tiêu Viêm"
        assert self.mock_db.add.called
        assert self.mock_db.commit.called

    def test_update_lore_success(self):
        mock_lore = StoryLore(
            id=uuid.uuid4(),
            story_id=self.mock_story.id,
            entity_name="Tiêu Viêm",
            entity_type="character",
            description="Nhân vật chính"
        )
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [self.mock_story, mock_lore]

        payload = {
            "entity_name": "Tiêu Viêm Ca",
            "description": "Nhân vật chính siêu cấp"
        }
        response = client.put(f"/api/v1/stories/{self.mock_story.id}/lores/{mock_lore.id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["entity_name"] == "Tiêu Viêm Ca"
        assert data["description"] == "Nhân vật chính siêu cấp"
        assert self.mock_db.commit.called

    def test_delete_lore_success(self):
        mock_lore = StoryLore(
            id=uuid.uuid4(),
            story_id=self.mock_story.id,
            entity_name="Tiêu Viêm",
            entity_type="character",
            description="Nhân vật chính"
        )
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [self.mock_story, mock_lore]

        response = client.delete(f"/api/v1/stories/{self.mock_story.id}/lores/{mock_lore.id}")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        assert self.mock_db.delete.called
        assert self.mock_db.commit.called

    def test_delete_lore_not_found(self):
        self.mock_db.query.return_value.filter.return_value.first.side_effect = [self.mock_story, None]

        response = client.delete(f"/api/v1/stories/{self.mock_story.id}/lores/{uuid.uuid4()}")
        assert response.status_code == 404

    def test_stream_ai_suggestions_endpoint(self, monkeypatch):
        async def fake_generate_stream(self, request, db=None):
            yield '{"suggestions": [{"title": "Title", "content": "Content", "reason": "Reason", "insertable_text": "Text", "quality_score": 0.9}]}'

        from app.ai.orchestrator import WritingAgent
        monkeypatch.setattr(WritingAgent, "generate_stream", fake_generate_stream)

        payload = {
            "chapter_id": "chapter-1",
            "story_id": str(self.mock_story.id),
            "context": "Once upon a time in a fantasy world...",
            "mode": "continue",
            "target_words": 100
        }
        
        response = client.post("/api/v1/ai/suggestions/stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        
        content = response.content.decode("utf-8")
        assert "data: " in content
        assert "done" in content

    def test_gateway_generate_stream(self, monkeypatch):
        from app.ai.gateway import GeminiGateway
        captured = {}

        class FakeResponse:
            def raise_for_status(self):
                pass
            async def aiter_text(self):
                chunks = [
                    '[\n',
                    '  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {"text": "Chunk 1"}\n          ]\n        }\n      }\n    ]\n  },\n',
                    '  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {"text": "Chunk 2"}\n          ]\n        }\n      }\n    ]\n  }\n',
                    ']\n'
                ]
                for chunk in chunks:
                    yield chunk

        class FakeStreamContext:
            async def __aenter__(self):
                return FakeResponse()
            async def __aexit__(self, exc_type, exc_val, exc_tb):
                pass

        def fake_stream(self, method, url, **kwargs):
            captured["method"] = method
            captured["url"] = url
            return FakeStreamContext()

        import httpx
        monkeypatch.setattr(httpx.AsyncClient, "stream", fake_stream)
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")

        gateway = GeminiGateway()

        async def run_test():
            chunks = []
            async for chunk in gateway.generate_stream(
                system_prompt="System",
                user_prompt="User",
                model="gemini-1.5-flash"
            ):
                chunks.append(chunk)
            return chunks

        import asyncio
        chunks = asyncio.run(run_test())

        assert len(chunks) == 2
        assert chunks[0] == "Chunk 1"
        assert chunks[1] == "Chunk 2"
        assert "streamGenerateContent" in captured["url"]

    def test_writing_agent_generate_stream(self, monkeypatch):
        from app.ai.orchestrator import WritingAgent
        from app.ai.gateway import GeminiGateway
        
        mock_lore = StoryLore(
            id=uuid.uuid4(),
            story_id=self.mock_story.id,
            entity_name="Tiêu Viêm",
            entity_type="character",
            description="Nhân vật chính"
        )
        self.mock_db.query.return_value.filter.return_value.all.return_value = [mock_lore]

        async def fake_gateway_stream(self, **kwargs):
            yield '{"suggestions": []}'

        monkeypatch.setattr(GeminiGateway, "generate_stream", fake_gateway_stream)
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")

        from app.schemas.ai import AISuggestionRequest
        req = AISuggestionRequest(
            chapter_id="chapter-1",
            story_id=str(self.mock_story.id),
            context="Tiêu Viêm bước vào phòng...",
            mode="continue"
        )

        agent = WritingAgent()

        async def run_test():
            chunks = []
            async for chunk in agent.generate_stream(req, db=self.mock_db):
                chunks.append(chunk)
            return chunks

        import asyncio
        chunks = asyncio.run(run_test())

        assert len(chunks) == 1
        assert chunks[0] == '{"suggestions": []}'


def test_extract_json_object_markdown():
    from app.ai.gateway import extract_json_object
    raw = "```json\n{\n  \"foo\": \"bar\"\n}\n```"
    result = extract_json_object(raw)
    assert result == {"foo": "bar"}


def test_extract_json_object_non_dict():
    from app.ai.gateway import extract_json_object, GeminiResponseError
    import pytest
    with pytest.raises(GeminiResponseError):
        extract_json_object("[1, 2, 3]")


def test_extract_text_malformed():
    from app.ai.gateway import _extract_text, GeminiResponseError
    import pytest
    with pytest.raises(GeminiResponseError):
        _extract_text({})
    with pytest.raises(GeminiResponseError):
        _extract_text({"candidates": []})
    with pytest.raises(GeminiResponseError):
        _extract_text({"candidates": [{"content": {}}]})
    with pytest.raises(GeminiResponseError):
        _extract_text({"candidates": [{"content": {"parts": [{"text": ""}]}}]})


def test_should_retry():
    from app.ai.gateway import _should_retry
    import httpx
    req = httpx.Request("POST", "http://test")
    resp_429 = httpx.Response(429, request=req)
    resp_500 = httpx.Response(500, request=req)
    resp_400 = httpx.Response(400, request=req)
    
    assert _should_retry(httpx.HTTPStatusError("429", request=req, response=resp_429)) is True
    assert _should_retry(httpx.HTTPStatusError("500", request=req, response=resp_500)) is True
    assert _should_retry(httpx.HTTPStatusError("400", request=req, response=resp_400)) is False
    
    assert _should_retry(httpx.ConnectError("conn")) is True
    assert _should_retry(httpx.TimeoutException("timeout")) is True
    assert _should_retry(ValueError("value error")) is False


def test_gateway_post_sync_success_and_retry(monkeypatch):
    from app.ai.gateway import GeminiGateway, GeminiGatewayError
    import httpx
    
    calls = []
    def fake_post(*args, **kwargs):
        calls.append(args[1])
        r = httpx.Response(
            200, 
            json={"candidates": [{"content": {"parts": [{"text": "{\"ok\": true}"}]}}]}, 
            request=httpx.Request("POST", args[1])
        )
        return r
    
    monkeypatch.setattr(httpx.Client, "post", fake_post)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")
    
    gw = GeminiGateway(max_retries=1)
    res, raw = gw.generate_json_sync(system_prompt="sys", user_prompt="usr")
    assert res == {"ok": True}
    
    def fake_post_fail(*args, **kwargs):
        url = args[1]
        r = httpx.Response(500, request=httpx.Request("POST", url))
        raise httpx.HTTPStatusError("Internal Server Error", request=httpx.Request("POST", url), response=r)
        
    monkeypatch.setattr(httpx.Client, "post", fake_post_fail)
    with pytest.raises(GeminiGatewayError):
        gw.generate_json_sync(system_prompt="sys", user_prompt="usr")


def test_gateway_post_async_fail(monkeypatch):
    from app.ai.gateway import GeminiGateway, GeminiGatewayError
    import httpx
    import pytest
    import asyncio
    
    async def fake_post_fail(*args, **kwargs):
        url = args[1]
        r = httpx.Response(429, request=httpx.Request("POST", url))
        raise httpx.HTTPStatusError("Too Many Requests", request=httpx.Request("POST", url), response=r)
        
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post_fail)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")
    
    gw = GeminiGateway(max_retries=1)
    with pytest.raises(GeminiGatewayError):
        asyncio.run(gw.generate_json(system_prompt="sys", user_prompt="usr"))


def test_embed_text_invalid_response(monkeypatch):
    from app.ai.gateway import GeminiGateway, GeminiResponseError
    import pytest
    import asyncio
    
    async def fake_post(*args, **kwargs):
        return {"embedding": {"values": None}}
        
    monkeypatch.setattr(GeminiGateway, "_post_async", fake_post)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")
    
    gw = GeminiGateway()
    with pytest.raises(GeminiResponseError):
        asyncio.run(gw.embed_text("hello"))


def test_gateway_generate_stream_escape_and_errors(monkeypatch):
    from app.ai.gateway import GeminiGateway
    import httpx
    import asyncio
    
    class FakeResponse:
        def raise_for_status(self):
            pass
        async def aiter_text(self):
            chunks = [
                '[\n',
                '  {\n    "candidates": [\n      {\n        "content": {\n          "parts": [\n            {"text": "Chunk \\"with\\n escape"}\n          ]\n        }\n      }\n    ]\n  },\n',
                '  malformed_chunk_here,\n',
                ']\n'
            ]
            for chunk in chunks:
                yield chunk

    class FakeStreamContext:
        async def __aenter__(self):
            return FakeResponse()
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    def fake_stream(*args, **kwargs):
        return FakeStreamContext()

    monkeypatch.setattr(httpx.AsyncClient, "stream", fake_stream)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-key")

    gateway = GeminiGateway()
    
    async def run_test():
        chunks = []
        async for chunk in gateway.generate_stream(
            system_prompt="System",
            user_prompt="User",
        ):
            chunks.append(chunk)
        return chunks

    chunks = asyncio.run(run_test())
    
    assert len(chunks) == 1
    assert "Chunk" in chunks[0]
