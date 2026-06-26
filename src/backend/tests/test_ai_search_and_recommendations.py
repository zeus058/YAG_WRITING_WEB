"""
Tests for U008 semantic search and U009 recommendations.
"""
from fastapi.testclient import TestClient

from app.api import deps
from app.ai import gateway as ai_gateway
from app.core.config import settings
from app.main import app

client = TestClient(app)


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return self

    def all(self):
        return self._rows


class FakeDb:
    def __init__(self):
        self.calls = []

    def execute(self, statement, params=None):
        sql_text = str(statement)
        self.calls.append((sql_text, params or {}))

        if "FROM reading_histories" in sql_text:
            return FakeResult(
                [
                    {
                        "story_id": "seen-1",
                        "title": "Seen Story",
                        "plot_summary": "A familiar narrative.",
                        "embedding": [0.1, 0.2, 0.3],
                    }
                ]
            )

        if "ORDER BY distance ASC" in sql_text:
            return FakeResult(
                [
                    {
                        "story_id": "story-1",
                        "title": "Semantic Match 1",
                        "plot_summary": "Strong match one.",
                        "distance": 0.01,
                    },
                    {
                        "story_id": "story-2",
                        "title": "Semantic Match 2",
                        "plot_summary": "Strong match two.",
                        "distance": 0.12,
                    },
                ]
            )

        return FakeResult([])


def test_semantic_search_returns_ranked_results(monkeypatch):
    fake_db = FakeDb()

    async def fake_post(self, url, json):
        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"embedding": {"values": [0.2, 0.3, 0.4]}}

        assert "embedContent" in url
        return FakeResponse()

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_gateway.httpx.AsyncClient, "post", fake_post)
    app.dependency_overrides[deps.get_db] = lambda: fake_db
    try:
        response = client.post(
            "/api/v1/stories/search",
            json={"query": "smart hero from underdog to champion", "limit": 2},
        )
        body = response.json()

        assert response.status_code == 200
        assert body["fallback"] is False
        assert body["provider"] == "gemini"
        assert body["query"] == "smart hero from underdog to champion"
        assert len(body["results"]) == 2
        assert body["results"][0]["story_id"] == "story-1"
    finally:
        app.dependency_overrides.clear()


def _override_reader_token():
    return {"sub": "reader-1", "role": "reader"}


def _override_reader_user_optional():
    class FakeUser:
        id = "reader-1"
    return FakeUser()


def test_recommendations_filter_seen_stories(monkeypatch):
    fake_db = FakeDb()

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
                                            '{"ranking": ['
                                            '{"story_id": "story-2", "reason": "Matches recent reading.", '
                                            '"match_tags": ["semantic", "same mood"], "source": "llm_rerank"},'
                                            '{"story_id": "hallucinated", "reason": "Invalid id", '
                                            '"match_tags": ["bad"], "source": "llm_rerank"}'
                                            "]}"
                                        )
                                    }
                                ]
                            }
                        }
                    ]
                }

        assert "generateContent" in url
        return FakeResponse()

    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(ai_gateway.httpx.AsyncClient, "post", fake_post)
    app.dependency_overrides[deps.get_db] = lambda: fake_db
    app.dependency_overrides[deps.get_current_user_optional] = _override_reader_user_optional
    try:
        response = client.get("/api/v1/recommendations")
        body = response.json()

        assert response.status_code == 200
        assert body["fallback"] is False
        assert body["provider"] == "gemini"
        assert body["model"] == settings.GEMINI_FAST_MODEL
        assert body["user_id"] == "reader-1"
        assert len(body["recommendations"]) >= 1
        assert body["recommendations"][0]["story_id"] != "seen-1"
        assert body["recommendations"][0]["story_id"] == "story-2"
        assert body["recommendations"][0]["source"] == "llm_rerank"
        assert "hallucinated" not in {
            item["story_id"] for item in body["recommendations"]
        }
    finally:
        app.dependency_overrides.clear()
