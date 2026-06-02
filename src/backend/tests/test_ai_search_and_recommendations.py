"""
Tests for U009 recommendations.
"""
from fastapi.testclient import TestClient

from app.api import deps
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
                        "story_id": "new-1",
                        "title": "New Story 1",
                        "plot_summary": "A better match.",
                        "distance": 0.12,
                    },
                    {
                        "story_id": "new-2",
                        "title": "New Story 2",
                        "plot_summary": "Another strong match.",
                        "distance": 0.18,
                    },
                ]
            )

        return FakeResult([])


def _override_reader_token():
    return {"sub": "reader-1", "role": "reader"}


def test_recommendations_filter_seen_stories(monkeypatch):
    fake_db = FakeDb()

    app.dependency_overrides[deps.get_db] = lambda: fake_db
    app.dependency_overrides[deps.require_authenticated_user] = _override_reader_token
    try:
        response = client.get("/api/v1/recommendations")
        body = response.json()

        assert response.status_code == 200
        assert body["fallback"] is False
        assert body["provider"] == "gemini"
        assert body["user_id"] == "reader-1"
        assert len(body["recommendations"]) >= 1
        assert body["recommendations"][0]["story_id"] != "seen-1"
    finally:
        app.dependency_overrides.clear()
