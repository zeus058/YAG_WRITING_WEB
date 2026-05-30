import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.models.chapter import Chapter
from app.models.story import Story
from app.models.user import User


class FakeQuery:
    def __init__(self, result):
        self.result = result

    def filter(self, *args, **kwargs):
        return self

    def first(self):
        return self.result


class FakeDB:
    def __init__(self, chapter=None, story=None):
        self.chapter = chapter
        self.story = story
        self.commits = 0

    def query(self, model):
        if model is Chapter:
            return FakeQuery(self.chapter)
        if model is Story:
            return FakeQuery(self.story)
        return FakeQuery(None)

    def add(self, obj):
        return None

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        return None

    def close(self):
        return None


def _objects():
    author_id = uuid.uuid4()
    story_id = uuid.uuid4()
    chapter_id = uuid.uuid4()
    user = User(id=author_id, username="author", email="a@yag.vn", password_hash="x", role="author")
    story = Story(
        id=story_id,
        author_id=author_id,
        title="Story",
        description="Desc",
        category="fantasy",
    )
    chapter = Chapter(
        id=chapter_id,
        story_id=story_id,
        chapter_number=1,
        title="Chapter 1",
        content="Safe chapter content",
        moderation_status="draft",
    )
    return user, story, chapter


def test_payload_to_dict_contains_required_moderation_fields():
    from app.services.publish_service import PublishTaskPayload

    payload = PublishTaskPayload(
        chapter_id="chap-001",
        story_id="story-001",
        content="chapter content",
        requested_by="user-abc",
        publish_at="2026-01-01T00:00:00+00:00",
        is_premium=True,
        requested_at="2026-01-01T00:00:00+00:00",
    )

    data = payload.to_dict()

    assert data["task_type"] == "publish_chapter"
    assert data["chapter_id"] == "chap-001"
    assert data["story_id"] == "story-001"
    assert data["content"] == "chapter content"
    assert data["publish_at"] == "2026-01-01T00:00:00+00:00"
    assert data["is_premium"] is True
    assert data["requested_by"] == "user-abc"


@patch("app.services.publish_service.get_rabbitmq_connection")
def test_push_task_uses_required_queue(mock_conn):
    from app.services.publish_service import PublishTaskPayload, push_publish_task_to_queue

    mock_channel = MagicMock()
    mock_connection = MagicMock()
    mock_connection.is_closed = False
    mock_connection.channel.return_value = mock_channel
    mock_conn.return_value = mock_connection

    payload = PublishTaskPayload(
        chapter_id="chap-001",
        story_id="story-001",
        content="content",
        requested_by="user-abc",
    )

    assert push_publish_task_to_queue(payload) is True
    mock_channel.queue_declare.assert_called_once_with(queue="yag_moderation_queue", durable=True)
    publish_kwargs = mock_channel.basic_publish.call_args.kwargs
    assert publish_kwargs["routing_key"] == "yag_moderation_queue"
    assert json.loads(publish_kwargs["body"].decode("utf-8"))["content"] == "content"


@patch("app.services.publish_service.get_rabbitmq_connection")
def test_push_task_returns_false_when_rabbitmq_offline(mock_conn):
    import pika.exceptions
    from app.services.publish_service import PublishTaskPayload, push_publish_task_to_queue

    mock_conn.side_effect = pika.exceptions.AMQPConnectionError("Connection refused")
    payload = PublishTaskPayload("chap-001", "story-001", "content", "user-abc")

    assert push_publish_task_to_queue(payload) is False


def test_prepare_publish_sets_pending_and_builds_payload():
    from app.services.publish_service import prepare_chapter_for_publish

    user, story, chapter = _objects()
    db = FakeDB(chapter=chapter, story=story)
    publish_at = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)

    prepared = prepare_chapter_for_publish(
        chapter_id=str(chapter.id),
        db=db,
        current_user=user,
        publish_at=publish_at,
        is_premium=True,
    )

    assert chapter.moderation_status == "pending"
    assert chapter.is_premium is True
    assert chapter.publish_at == publish_at
    assert prepared.previous_status == "draft"
    assert prepared.payload.story_id == str(story.id)
    assert prepared.payload.content == "Safe chapter content"
    assert db.commits == 1


def test_prepare_publish_rejects_non_owner():
    from app.services.publish_service import prepare_chapter_for_publish

    user, story, chapter = _objects()
    user.id = uuid.uuid4()
    db = FakeDB(chapter=chapter, story=story)

    with pytest.raises(PermissionError):
        prepare_chapter_for_publish(str(chapter.id), db, user)


@pytest.fixture
def client():
    with patch("app.core.database.engine") as mock_engine:
        mock_engine.connect.return_value.__enter__ = MagicMock()
        mock_engine.connect.return_value.__exit__ = MagicMock(return_value=False)

        from app.api import deps
        from app.main import app

        user, story, chapter = _objects()
        fake_db = FakeDB(chapter=chapter, story=story)
        app.dependency_overrides[deps.get_db] = lambda: fake_db
        app.dependency_overrides[deps.get_current_user] = lambda: user

        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client, chapter

        app.dependency_overrides.clear()


@patch("app.api.v1.endpoints.publish.push_publish_task_to_queue", return_value=True)
def test_endpoint_publish_202(mock_push, client):
    test_client, chapter = client

    response = test_client.post(
        f"/api/v1/author/chapters/{chapter.id}/publish",
        json={"is_premium": True},
    )

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "accepted"
    assert data["chapter_id"] == str(chapter.id)
    assert data["queue"] == "yag_moderation_queue"
    assert data["moderation_status"] == "pending"
    assert data["is_premium"] is True


@patch("app.api.v1.endpoints.publish.push_publish_task_to_queue", return_value=False)
def test_endpoint_publish_503_restores_previous_status(mock_push, client):
    test_client, chapter = client

    response = test_client.post(f"/api/v1/author/chapters/{chapter.id}/publish")

    assert response.status_code == 503
    assert chapter.moderation_status == "draft"
