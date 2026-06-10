"""
Tests for U006 AI suggestion flow.
"""

from app.api import deps
from app.ai import gateway as ai_gateway
from app.ai.tools import get_author_style_profile
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

        captured["url"] = url
        captured["payload"] = json
        return FakeResponse()

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "AI_CONTEXT_WORD_LIMIT", 3)
    monkeypatch.setattr(ai_gateway.httpx.AsyncClient, "post", fake_post)

    request = ai_service.AISuggestionRequest(
        chapter_id="chapter-1",
        context="one two three four five six",
        mode="bí ẩn",
        styleReferenceStoryTitle="Example Reference Story",
        styleReferenceSeriesTitle="Example Series",
        styleReferenceAuthor="Example Author",
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
        assert body["model"] == settings.GEMINI_STRONG_MODEL
        assert body["mode"] == "bí ẩn"
        assert len(body["suggestions"]) == 3
        assert body["suggestions"][0]["title"] == "A"
        assert settings.GEMINI_STRONG_MODEL in captured["url"]
        prompt_text = captured["payload"]["contents"][0]["parts"][0]["text"]
        assert "one two three" not in prompt_text
        assert "four five six" in prompt_text
        assert "Example Reference Story" in prompt_text
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
    assert all(item.insertable_text for item in items)
    response = AISuggestionResponse(
        chapter_id="chapter-1",
        mode="kịch tính",
        provider="fallback",
        fallback=True,
        suggestions=items,
    )
    assert response.fallback is True


def test_author_style_profile_prefers_history_over_reference():
    profile = get_author_style_profile(
        {
            "story": {
                "style_reference": {
                    "story_title": "Reference Story",
                    "series_title": "Reference Series",
                    "author": "Reference Author",
                }
            },
            "recent_chapters": [
                {"excerpt": "Nhân vật bước vào phòng. Một câu thoại vang lên."}
            ],
            "previous_author_chapters": [
                {"excerpt": "Tác phẩm cũ có nhịp câu ngắn và đối thoại trực tiếp."}
            ],
        }
    )

    assert profile["source"] == "author_history"
    assert profile["has_author_history"] is True


def test_author_style_profile_uses_reference_when_no_history():
    profile = get_author_style_profile(
        {
            "story": {
                "style_reference": {
                    "story_title": "Reference Story",
                    "series_title": "Reference Series",
                    "author": "Reference Author",
                }
            },
            "recent_chapters": [],
            "previous_author_chapters": [],
        }
    )

    assert profile["source"] == "reference_metadata"
    assert profile["has_author_history"] is False
    assert profile["reference"]["author"] == "Reference Author"


def test_ai_tools_and_mcp_manifest_are_authenticated():
    response = client.get("/api/v1/ai/tools")
    assert response.status_code == 401

    app.dependency_overrides[deps.require_authenticated_user] = (
        lambda: {"sub": "reader-1", "role": "reader"}
    )
    try:
        tools_response = client.get("/api/v1/ai/tools")
        manifest_response = client.get("/api/v1/ai/mcp/manifest")

        assert tools_response.status_code == 200
        assert manifest_response.status_code == 200
        tools = tools_response.json()
        manifest = manifest_response.json()
        assert any(tool["name"] == "get_story_context" for tool in tools)
        assert manifest["name"] == "yag-ai-agent"
        assert manifest["model_routing"]["writing"] == settings.GEMINI_STRONG_MODEL
        assert any(skill["name"] == "writing_coach" for skill in manifest["skills"])
    finally:
        app.dependency_overrides.clear()


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



