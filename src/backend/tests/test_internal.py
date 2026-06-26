import base64
import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app

client = TestClient(app)


def test_pubsub_moderation_requires_internal_auth():
    old_token = settings.INTERNAL_TASK_TOKEN
    settings.INTERNAL_TASK_TOKEN = "internal_test_token_at_least_32_chars"
    try:
        response = client.post(
            f"{settings.API_V1_STR}/internal/pubsub/moderation",
            json={"task_type": "publish_chapter"},
        )
    finally:
        settings.INTERNAL_TASK_TOKEN = old_token

    assert response.status_code == 401


def test_pubsub_moderation_accepts_pubsub_envelope():
    old_token = settings.INTERNAL_TASK_TOKEN
    settings.INTERNAL_TASK_TOKEN = "internal_test_token_at_least_32_chars"
    task_payload = {
        "task_type": "publish_chapter",
        "chapter_id": "chapter-1",
        "attempt": 0,
    }
    encoded_payload = base64.b64encode(
        json.dumps(task_payload).encode("utf-8")
    ).decode("utf-8")

    try:
        with patch(
            "app.api.v1.endpoints.internal.handle_publish_chapter"
        ) as mock_handle:
            response = client.post(
                f"{settings.API_V1_STR}/internal/pubsub/moderation",
                headers={"X-Internal-Task-Token": settings.INTERNAL_TASK_TOKEN},
                json={"message": {"data": encoded_payload}},
            )
    finally:
        settings.INTERNAL_TASK_TOKEN = old_token

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    mock_handle.assert_called_once_with(task_payload)
