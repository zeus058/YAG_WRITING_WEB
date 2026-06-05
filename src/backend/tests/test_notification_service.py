import pytest
import asyncio
import json
from unittest.mock import MagicMock, patch, AsyncMock
from uuid import uuid4
from datetime import datetime, timezone
from jose import jwt, JWTError
from fastapi import WebSocketDisconnect

from app.core.config import settings
from app.models.notification import Notification
from app.services.notification_service import (
    _channel_name,
    get_redis_client,
    publish_user_notification,
    _token_from_websocket,
    _is_authorized_notification_socket,
    stream_user_notifications,
    create_notification,
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_unread_count,
)


def test_channel_name():
    assert _channel_name("user123") == "yag.notifications.user123"


def test_get_redis_client():
    # Test Redis client creation when REDIS_URL is set
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.REDIS_URL = "redis://localhost:6379/0"
        with patch("app.services.notification_service.redis.Redis.from_url") as mock_from_url:
            get_redis_client()
            mock_from_url.assert_called_once_with(
                "redis://localhost:6379/0",
                decode_responses=True,
                socket_timeout=2.0,
            )

    # Test Redis client creation when REDIS_URL is not set
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.REDIS_URL = None
        mock_settings.REDIS_HOST = "localhost"
        mock_settings.REDIS_PORT = 6379
        with patch("app.services.notification_service.redis.Redis") as mock_redis_class:
            get_redis_client()
            mock_redis_class.assert_called_once_with(
                host="localhost",
                port=6379,
                db=0,
                decode_responses=True,
                socket_timeout=2.0,
            )


def test_publish_user_notification_success():
    mock_redis = MagicMock()
    with patch("app.services.notification_service.get_redis_client", return_value=mock_redis):
        result = publish_user_notification("user123", {"message": "hello"})
        assert result is True
        mock_redis.publish.assert_called_once_with(
            "yag.notifications.user123",
            json.dumps({"message": "hello"}, ensure_ascii=False)
        )


def test_publish_user_notification_failure():
    mock_redis = MagicMock()
    mock_redis.publish.side_effect = Exception("Redis error")
    with patch("app.services.notification_service.get_redis_client", return_value=mock_redis):
        result = publish_user_notification("user123", {"message": "hello"})
        assert result is False


def test_token_from_websocket_query_params():
    # Token from query param (token or access_token)
    mock_ws = MagicMock()
    mock_ws.query_params = {"token": "query-token-1"}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = True
        assert _token_from_websocket(mock_ws) == "query-token-1"

    mock_ws.query_params = {"access_token": "query-token-2"}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = True
        assert _token_from_websocket(mock_ws) == "query-token-2"

    # Token from query param should be ignored if ALLOW_WEBSOCKET_QUERY_TOKEN is False
    mock_ws.query_params = {"token": "query-token-1"}
    mock_ws.headers = {}
    mock_ws.cookies = {}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
        assert _token_from_websocket(mock_ws) is None


def test_token_from_websocket_auth_header():
    mock_ws = MagicMock()
    mock_ws.query_params = {}
    mock_ws.headers = {"authorization": "Bearer header-token"}
    mock_ws.cookies = {}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
        assert _token_from_websocket(mock_ws) == "header-token"


def test_token_from_websocket_cookies():
    mock_ws = MagicMock()
    mock_ws.query_params = {}
    mock_ws.headers = {}
    mock_ws.cookies = {"access_token": "cookie-token-1"}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
        assert _token_from_websocket(mock_ws) == "cookie-token-1"

    mock_ws.cookies = {"token": "cookie-token-2"}
    with patch("app.services.notification_service.settings") as mock_settings:
        mock_settings.ALLOW_WEBSOCKET_QUERY_TOKEN = False
        assert _token_from_websocket(mock_ws) == "cookie-token-2"


def test_is_authorized_notification_socket():
    mock_ws = MagicMock()
    user_id = str(uuid4())

    # Case 1: No token
    with patch("app.services.notification_service._token_from_websocket", return_value=None):
        assert _is_authorized_notification_socket(mock_ws, user_id) is False

    # Case 2: JWT Error
    with patch("app.services.notification_service._token_from_websocket", return_value="bad-token"):
        with patch("app.services.notification_service.jwt.decode", side_effect=JWTError):
            assert _is_authorized_notification_socket(mock_ws, user_id) is False

    # Case 3: Correct sub
    with patch("app.services.notification_service._token_from_websocket", return_value="good-token"):
        with patch("app.services.notification_service.jwt.decode", return_value={"sub": user_id}):
            assert _is_authorized_notification_socket(mock_ws, user_id) is True

    # Case 4: Incorrect sub
    with patch("app.services.notification_service._token_from_websocket", return_value="good-token"):
        with patch("app.services.notification_service.jwt.decode", return_value={"sub": "other-user"}):
            assert _is_authorized_notification_socket(mock_ws, user_id) is False


def test_stream_user_notifications_unauthorized():
    mock_ws = AsyncMock()
    user_id = str(uuid4())
    with patch("app.services.notification_service._is_authorized_notification_socket", return_value=False):
        asyncio.run(stream_user_notifications(mock_ws, user_id))
        mock_ws.close.assert_called_once_with(code=1008)
        mock_ws.accept.assert_not_called()


def test_stream_user_notifications_success():
    mock_ws = AsyncMock()
    user_id = str(uuid4())

    mock_pubsub = MagicMock()
    # Mock message returns: first message has valid JSON, second is invalid, third raises WebSocketDisconnect
    msg_1 = {"data": json.dumps({"type": "info", "message": "hello"})}
    msg_2 = {"data": "non-json-raw-text"}
    mock_pubsub.get_message.side_effect = [msg_1, msg_2, None]

    # Handle receive_text() timeout or disconnect
    mock_ws.receive_text.side_effect = [asyncio.TimeoutError(), WebSocketDisconnect()]

    mock_redis = MagicMock()
    mock_redis.pubsub.return_value = mock_pubsub

    with patch("app.services.notification_service._is_authorized_notification_socket", return_value=True), \
         patch("app.services.notification_service.get_redis_client", return_value=mock_redis):
        
        asyncio.run(stream_user_notifications(mock_ws, user_id))
        
        # Verify accept was called
        mock_ws.accept.assert_called_once()
        
        # Verify messages sent
        mock_ws.send_json.assert_called_once_with({"type": "info", "message": "hello"})
        mock_ws.send_text.assert_called_once_with("non-json-raw-text")
        
        # Verify clean unsubscribe
        mock_pubsub.subscribe.assert_called_once_with(f"yag.notifications.{user_id}")
        mock_pubsub.unsubscribe.assert_called_once_with(f"yag.notifications.{user_id}")
        mock_pubsub.close.assert_called_once()


def test_stream_user_notifications_exception():
    mock_ws = AsyncMock()
    user_id = str(uuid4())

    mock_pubsub = MagicMock()
    mock_pubsub.get_message.side_effect = Exception("Pubsub crash")

    mock_redis = MagicMock()
    mock_redis.pubsub.return_value = mock_pubsub

    with patch("app.services.notification_service._is_authorized_notification_socket", return_value=True), \
         patch("app.services.notification_service.get_redis_client", return_value=mock_redis):
        
        asyncio.run(stream_user_notifications(mock_ws, user_id))
        
        # Connection should close due to exception
        mock_ws.close.assert_called_once()
        # Pubsub should clean up
        mock_pubsub.unsubscribe.assert_called_once()
        mock_pubsub.close.assert_called_once()


def test_db_persistent_operations():
    db = MagicMock()
    user_id = uuid4()

    # 1. create_notification
    # Mock return attributes for Notification constructor when added
    def add_side_effect(obj):
        obj.id = uuid4()
        obj.created_at = datetime.now(timezone.utc)
    db.add.side_effect = add_side_effect

    with patch("app.services.notification_service.publish_user_notification") as mock_publish:
        notif = create_notification(db, user_id, "test_type", "Test Title", "Test Message", {"extra": "data"})
        assert notif.user_id == user_id
        assert notif.title == "Test Title"
        assert notif.payload == {"extra": "data"}
        assert db.commit.called
        assert db.refresh.called
        assert mock_publish.called

    # 2. get_user_notifications
    mock_query = db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_order = mock_filter.order_by.return_value
    mock_limit = mock_order.limit.return_value
    mock_limit.all.return_value = [notif]

    results = get_user_notifications(db, user_id, limit=10)
    assert len(results) == 1
    assert results[0] == notif
    mock_query.filter.assert_called_once()

    # 3. mark_notification_as_read
    db.query.reset_mock()
    db.commit.reset_mock()
    mock_notification = MagicMock(spec=Notification)
    mock_notification.read_at = None
    db.query.return_value.filter.return_value.first.return_value = mock_notification

    notif_id = uuid4()
    updated_notif = mark_notification_as_read(db, notif_id, user_id)
    assert updated_notif is not None
    assert updated_notif.read_at is not None
    assert db.commit.called

    # 4. mark_all_notifications_as_read
    db.query.reset_mock()
    db.commit.reset_mock()
    db.query.return_value.filter.return_value.update.return_value = 4
    
    count = mark_all_notifications_as_read(db, user_id)
    assert count == 4
    assert db.commit.called

    # 5. get_unread_count
    db.query.reset_mock()
    db.query.return_value.filter.return_value.count.return_value = 3
    
    unread_cnt = get_unread_count(db, user_id)
    assert unread_cnt == 3
