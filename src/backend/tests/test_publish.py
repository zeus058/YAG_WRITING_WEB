"""
Test cases cho U005 - Xuất bản chương truyện (RabbitMQ).
Chạy: pytest tests/test_publish.py -v
Không cần RabbitMQ hay PostgreSQL thật — toàn bộ dùng mock.
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


# ──────────────────────────────────────────────
# TC-1: PublishTaskPayload tạo đúng cấu trúc
# ──────────────────────────────────────────────

def test_payload_to_dict():
    from app.services.publish_service import PublishTaskPayload

    payload = PublishTaskPayload(
        chapter_id="chap-001",
        requested_by="user-abc",
        requested_at="2024-01-01T00:00:00",
    )
    data = payload.to_dict()

    assert data["task_type"] == "publish_chapter"
    assert data["chapter_id"] == "chap-001"
    assert data["requested_by"] == "user-abc"
    assert data["requested_at"] == "2024-01-01T00:00:00"


def test_payload_auto_timestamp():
    from app.services.publish_service import PublishTaskPayload

    before = datetime.utcnow().isoformat()
    payload = PublishTaskPayload(chapter_id="chap-001", requested_by="user-abc")
    after = datetime.utcnow().isoformat()

    assert before <= payload.requested_at <= after


# ──────────────────────────────────────────────
# TC-2: push_publish_task_to_queue — thành công
# ──────────────────────────────────────────────

@patch("app.services.publish_service.get_rabbitmq_connection")
def test_push_task_success(mock_conn):
    from app.services.publish_service import PublishTaskPayload, push_publish_task_to_queue

    mock_channel = MagicMock()
    mock_connection = MagicMock()
    mock_connection.is_closed = False
    mock_connection.channel.return_value = mock_channel
    mock_conn.return_value = mock_connection

    payload = PublishTaskPayload(chapter_id="chap-001", requested_by="user-abc")
    result = push_publish_task_to_queue(payload)

    assert result is True
    mock_channel.queue_declare.assert_called_once_with(
        queue="chapter_publish_queue",
        durable=True,
    )
    mock_channel.basic_publish.assert_called_once()
    mock_connection.close.assert_called_once()


# ──────────────────────────────────────────────
# TC-3: push_publish_task_to_queue — RabbitMQ offline
# ──────────────────────────────────────────────

@patch("app.services.publish_service.get_rabbitmq_connection")
def test_push_task_rabbitmq_offline(mock_conn):
    import pika.exceptions
    from app.services.publish_service import PublishTaskPayload, push_publish_task_to_queue

    mock_conn.side_effect = pika.exceptions.AMQPConnectionError("Connection refused")

    payload = PublishTaskPayload(chapter_id="chap-001", requested_by="user-abc")
    result = push_publish_task_to_queue(payload)

    assert result is False


# ──────────────────────────────────────────────
# TC-4: validate_chapter_for_publish — hợp lệ
# ──────────────────────────────────────────────

def test_validate_chapter_success():
    from app.services.publish_service import validate_chapter_for_publish

    db = MagicMock()
    result = validate_chapter_for_publish("chap-001", db)

    assert result["chapter_id"] == "chap-001"
    assert result["status"] == "draft"


# ──────────────────────────────────────────────
# TC-5 → TC-7: FastAPI endpoint
# Mock engine để TestClient không connect DB thật
# ──────────────────────────────────────────────

@pytest.fixture
def client():
    """TestClient với DB và engine đều mock — không cần PostgreSQL thật."""
    # Phải patch engine TRƯỚC KHI import app để chặn init_db gọi create_all
    with patch("app.core.database.engine") as mock_engine:
        mock_engine.connect.return_value.__enter__ = MagicMock()
        mock_engine.connect.return_value.__exit__ = MagicMock(return_value=False)

        from app.main import app
        from app.api import deps

        mock_db = MagicMock()
        app.dependency_overrides[deps.get_db] = lambda: mock_db

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c

        app.dependency_overrides.clear()


@patch("app.api.v1.endpoints.publish.push_publish_task_to_queue", return_value=True)
@patch("app.api.v1.endpoints.publish.validate_chapter_for_publish",
       return_value={"chapter_id": "chap-001", "status": "draft"})
def test_endpoint_publish_202(mock_validate, mock_push, client):
    """TC-5: Endpoint trả về 202 khi mọi thứ OK."""
    response = client.post("/api/v1/chapters/chap-001/publish")

    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "accepted"
    assert data["chapter_id"] == "chap-001"
    assert "queued_at" in data


@patch("app.api.v1.endpoints.publish.push_publish_task_to_queue", return_value=False)
@patch("app.api.v1.endpoints.publish.validate_chapter_for_publish",
       return_value={"chapter_id": "chap-001", "status": "draft"})
def test_endpoint_publish_503_rabbitmq_down(mock_validate, mock_push, client):
    """TC-6: Endpoint trả về 503 khi RabbitMQ không kết nối được."""
    response = client.post("/api/v1/chapters/chap-001/publish")

    assert response.status_code == 503
    assert "RabbitMQ" in response.json()["detail"]


@patch("app.api.v1.endpoints.publish.validate_chapter_for_publish")
def test_endpoint_publish_404_chapter_not_found(mock_validate, client):
    """TC-7: Endpoint trả về 404 khi chapter không tồn tại."""
    mock_validate.side_effect = ValueError("Chapter chap-999 không tồn tại")

    response = client.post("/api/v1/chapters/chap-999/publish")

    assert response.status_code == 404
    assert "không tồn tại" in response.json()["detail"]


# ──────────────────────────────────────────────
# TC-8 → TC-10: Worker callback
# ──────────────────────────────────────────────

def test_worker_on_message_success():
    """TC-8: Worker xử lý đúng message và gọi basic_ack."""
    import json
    from app.worker.main import on_message

    mock_channel = MagicMock()
    mock_method = MagicMock()
    mock_method.delivery_tag = "tag-001"

    body = json.dumps({
        "task_type": "publish_chapter",
        "chapter_id": "chap-001",
        "requested_by": "user-abc",
        "requested_at": "2024-01-01T00:00:00",
    }).encode()

    on_message(mock_channel, mock_method, None, body)

    mock_channel.basic_ack.assert_called_once_with(delivery_tag="tag-001")
    mock_channel.basic_nack.assert_not_called()


def test_worker_on_message_invalid_json():
    """TC-9: Worker ACK và bỏ qua message JSON lỗi (tránh loop vô hạn)."""
    from app.worker.main import on_message

    mock_channel = MagicMock()
    mock_method = MagicMock()
    mock_method.delivery_tag = "tag-002"

    on_message(mock_channel, mock_method, None, b"not valid json {{{")

    mock_channel.basic_ack.assert_called_once_with(delivery_tag="tag-002")


def test_worker_on_message_unknown_task_type():
    """TC-10: Worker ACK message với task_type không xác định."""
    import json
    from app.worker.main import on_message

    mock_channel = MagicMock()
    mock_method = MagicMock()
    mock_method.delivery_tag = "tag-003"

    body = json.dumps({"task_type": "unknown_task"}).encode()
    on_message(mock_channel, mock_method, None, body)

    mock_channel.basic_ack.assert_called_once_with(delivery_tag="tag-003")