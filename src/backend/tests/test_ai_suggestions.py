"""
Tests for U006 AI suggestion flow.
"""

from app.api import deps
from app.core.config import settings
from app.main import app
from app.schemas.ai import AISuggestionItem, AISuggestionResponse
from app.services import ai_service
from fastapi.testclient import TestClient

client = TestClient(app)


def _override_author_token():
    return {"sub": "author-1", "role": "author"}


def test_generate_ai_suggestions_truncates_context(monkeypatch):
    captured = {}

    async def fake_post(self, url, json):
        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {
                                        "text": (
                                            '{"suggestions": ['
                                            '{"title": "A", "content": "B"},'
                                            '{"title": "C", "content": "D"},'
                                            '{"title": "E", "content": "F"}'
                                            "]}"
                                        )
                                    }
                                ]
                            }
                        }
                    ]
                }

        captured["payload"] = json
        return FakeResponse()

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "AI_CONTEXT_WORD_LIMIT", 3)
    monkeypatch.setattr(ai_service.httpx.AsyncClient, "post", fake_post)

    request = ai_service.AISuggestionRequest(
        chapter_id="chapter-1",
        context="one two three four five six",
        mode="bí ẩn",
    )

    response = client.post(
        "/api/v1/ai/suggestions",
        json=request.model_dump(by_alias=True),
        headers={"Authorization": "Bearer fake"},
    )

    assert response.status_code == 401

    app.dependency_overrides[deps.require_author_role] = _override_author_token
    try:
        response = client.post(
            "/api/v1/ai/suggestions",
            json=request.model_dump(by_alias=True),
            headers={"Authorization": "Bearer fake"},
        )
        body = response.json()
        assert response.status_code == 200
        assert body["fallback"] is False
        assert body["mode"] == "bí ẩn"
        assert len(body["suggestions"]) == 3
        assert body["suggestions"][0]["title"] == "A"
        prompt_text = captured["payload"]["contents"][0]["parts"][0]["text"]
        assert "one two three" not in prompt_text
        assert "four five six" in prompt_text
    finally:
        app.dependency_overrides.clear()


def test_fallback_response_when_api_key_missing(monkeypatch):
    request = ai_service.AISuggestionRequest(
        chapter_id="chapter-1",
        context="Một đoạn văn rất ngắn.",
        mode="lãng mạn",
    )

    app.dependency_overrides[deps.require_author_role] = _override_author_token
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    try:
        response = client.post(
            "/api/v1/ai/suggestions",
            json=request.model_dump(by_alias=True),
        )
        body = response.json()
        assert response.status_code == 200
        assert body["fallback"] is True
        assert body["provider"] == "fallback"
        assert len(body["suggestions"]) == 3
    finally:
        app.dependency_overrides.clear()


def test_fallback_library_has_three_items():
    items = ai_service.build_fallback_items("kịch tính")
    assert len(items) == 3
    assert all(isinstance(item, AISuggestionItem) for item in items)
    response = AISuggestionResponse(
        chapter_id="chapter-1",
        mode="kịch tính",
        provider="fallback",
        fallback=True,
        suggestions=items,
    )
    assert response.fallback is True


def test_ai_suggestion_context_exceeds_limit():
    context = "word " * 1001
    app.dependency_overrides[deps.require_author_role] = _override_author_token
    try:
        response = client.post(
            "/api/v1/ai/suggestions",
            json={
                "chapter_id": "chapter-1",
                "context": context,
                "mode": "kịch tính"
            }
        )
        assert response.status_code == 422
        assert "Context length cannot exceed 1000 words" in response.text
    finally:
        app.dependency_overrides.clear()


def test_unused_ai_suggest_request_schema():
    from app.schemas.ai import AISuggestRequest
    import uuid
    import pytest
    from pydantic import ValidationError

    req = AISuggestRequest(chapter_id=uuid.uuid4(), context="valid context")
    assert req.context == "valid context"

    long_context = "a " * 1001
    with pytest.raises(ValidationError) as exc_info:
        AISuggestRequest(chapter_id=uuid.uuid4(), context=long_context)
    assert "Context length cannot exceed 1000 words" in str(exc_info.value)
