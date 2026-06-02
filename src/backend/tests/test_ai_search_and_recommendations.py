"""
Tests for U008 semantic search.
"""
from fastapi.testclient import TestClient

from app.api import deps
from app.core.config import settings
from app.main import app
from app.services import ai_service

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
    monkeypatch.setattr(ai_service.httpx.AsyncClient, "post", fake_post)
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
