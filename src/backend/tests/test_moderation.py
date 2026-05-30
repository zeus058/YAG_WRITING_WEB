import json
import uuid
from unittest.mock import MagicMock, patch

from app.models.chapter import Chapter
from app.models.story import Story
from app.services.moderation_service import (
    ModerationReport,
    ModerationResult,
    apply_moderation_result,
    moderate_content,
)


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
        self.added = []
        self.committed = False

    def query(self, model):
        if model is Chapter:
            return FakeQuery(self.chapter)
        if model is Story:
            return FakeQuery(self.story)
        return FakeQuery(None)

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return None

    def close(self):
        return None


def _mock_gemini_response(result: str, reason: str, categories: list, confidence: float):
    mock_resp = MagicMock()
    mock_resp.text = json.dumps(
        {
            "result": result,
            "reason": reason,
            "flagged_categories": categories,
            "confidence_score": confidence,
        }
    )
    return mock_resp


def _chapter():
    return Chapter(
        id=uuid.uuid4(),
        story_id=uuid.uuid4(),
        chapter_number=1,
        title="Chapter",
        content="Safe content",
        moderation_status="pending",
    )


@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_approved(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"
    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value = _mock_gemini_response(
        "approved",
        "Safe content",
        [],
        0.97,
    )
    mock_model.return_value = mock_gemini

    report = moderate_content("Safe chapter", chapter_id="chap-001")

    assert report.result == ModerationResult.APPROVED
    assert report.flagged_categories == []
    assert report.confidence == 0.97
    mock_gemini.generate_content.assert_called_once()


@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_rejected(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"
    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value = _mock_gemini_response(
        "Rejected",
        "Severe sexual content",
        ["sexual_content"],
        0.91,
    )
    mock_model.return_value = mock_gemini

    report = moderate_content("Unsafe chapter", chapter_id="chap-002")

    assert report.result == ModerationResult.REJECTED
    assert report.flagged_categories == ["sexual_content"]
    assert report.confidence == 0.91


@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_flagged_json_fence(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"
    mock_gemini = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = '```json\n{"result":"flagged","reason":"violence","flagged_categories":["violence"],"confidence_score":0.88}\n```'
    mock_gemini.generate_content.return_value = mock_resp
    mock_model.return_value = mock_gemini

    report = moderate_content("Violent chapter", chapter_id="chap-003")

    assert report.result == ModerationResult.FLAGGED
    assert "violence" in report.flagged_categories
    assert report.confidence == 0.88


@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_invalid_json_returns_error(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"
    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value.text = "not json"
    mock_model.return_value = mock_gemini

    report = moderate_content("Any chapter", chapter_id="chap-004")

    assert report.result == ModerationResult.ERROR
    assert report.flagged_categories == []


@patch("app.services.moderation_service.settings")
def test_moderate_content_no_api_key_auto_approved(mock_settings):
    mock_settings.GEMINI_API_KEY = ""

    report = moderate_content("Any content", chapter_id="chap-005")

    assert report.result == ModerationResult.APPROVED
    assert report.confidence == 1.0


def test_apply_result_approved_logs_non_violation():
    chapter = _chapter()
    db = FakeDB(chapter=chapter)
    report = ModerationReport(ModerationResult.APPROVED, "OK", [], 0.95)

    result = apply_moderation_result(str(chapter.id), report, db)

    assert result.moderation_status == "approved"
    assert db.committed is True
    log = db.added[-1]
    assert log.is_violation is False
    assert log.confidence_score == 0.95


def test_apply_result_flagged_logs_violation():
    chapter = _chapter()
    db = FakeDB(chapter=chapter)
    report = ModerationReport(ModerationResult.FLAGGED, "Violence", ["violence"], 0.88)

    result = apply_moderation_result(str(chapter.id), report, db)

    assert result.moderation_status == "flagged"
    log = db.added[-1]
    assert log.is_violation is True
    assert log.violation_category == "violence"


@patch("app.worker.main.publish_user_notification", return_value=True)
@patch("app.worker.main.apply_moderation_result")
@patch("app.worker.main.moderate_content")
def test_worker_calls_moderation_and_notifies_author(mock_moderate, mock_apply, mock_notify):
    from app.worker.main import handle_publish_chapter

    chapter = _chapter()
    db = FakeDB(chapter=chapter)
    report = ModerationReport(ModerationResult.APPROVED, "OK", [], 0.99)
    mock_moderate.return_value = report
    mock_apply.return_value = chapter

    handle_publish_chapter(
        {
            "task_type": "publish_chapter",
            "chapter_id": str(chapter.id),
            "requested_by": "author-001",
        },
        db=db,
    )

    mock_moderate.assert_called_once()
    mock_apply.assert_called_once()
    mock_notify.assert_called_once()


@patch("app.worker.main.time.sleep")
@patch("app.worker.main.handle_publish_chapter")
def test_worker_requeues_retryable_moderation_error(mock_handle, mock_sleep):
    from app.worker.main import RetryableModerationError, on_message

    mock_handle.side_effect = RetryableModerationError("429 rate limit")
    mock_channel = MagicMock()
    mock_method = MagicMock(delivery_tag="tag-001")
    body = json.dumps({"task_type": "publish_chapter", "chapter_id": "chap-001"}).encode()

    on_message(mock_channel, mock_method, None, body)

    mock_sleep.assert_called_once()
    mock_channel.basic_nack.assert_called_once_with(delivery_tag="tag-001", requeue=True)


@patch("app.worker.main.handle_publish_chapter")
def test_worker_acks_invalid_json_without_retry(mock_handle):
    from app.worker.main import on_message

    mock_channel = MagicMock()
    mock_method = MagicMock(delivery_tag="tag-002")

    on_message(mock_channel, mock_method, None, b"not json")

    mock_handle.assert_not_called()
    mock_channel.basic_ack.assert_called_once_with(delivery_tag="tag-002")
