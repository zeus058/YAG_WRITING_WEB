"""
Test cases cho U013 - Kiểm duyệt nội dung AI (Gemini).
Chạy: pytest tests/test_moderation.py -v
Không cần Gemini API key thật — toàn bộ dùng mock.
"""
import pytest
from unittest.mock import MagicMock, patch

from app.services.moderation_service import (
    ModerationResult,
    ModerationReport,
    moderate_content,
    apply_moderation_result,
)


# ──────────────────────────────────────────────
# Helper: tạo Gemini response giả
# ──────────────────────────────────────────────

def _mock_gemini_response(result: str, reason: str, categories: list, confidence: float):
    import json
    mock_resp = MagicMock()
    mock_resp.text = json.dumps({
        "result": result,
        "reason": reason,
        "flagged_categories": categories,
        "confidence": confidence,
    })
    return mock_resp


# ──────────────────────────────────────────────
# TC-027-01: Nội dung sạch → APPROVED
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_approved(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"

    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value = _mock_gemini_response(
        result="approved",
        reason="Nội dung phù hợp",
        categories=[],
        confidence=0.97,
    )
    mock_model.return_value = mock_gemini

    report = moderate_content("Đây là nội dung bình thường", chapter_id="chap-001")

    assert report.result == ModerationResult.APPROVED
    assert report.flagged_categories == []
    assert report.confidence == 0.97
    mock_gemini.generate_content.assert_called_once()


# ──────────────────────────────────────────────
# TC-027-02: Nội dung vi phạm → FLAGGED
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_flagged(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"

    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value = _mock_gemini_response(
        result="flagged",
        reason="Phát hiện nội dung bạo lực",
        categories=["violence"],
        confidence=0.91,
    )
    mock_model.return_value = mock_gemini

    report = moderate_content("Nội dung bạo lực...", chapter_id="chap-002")

    assert report.result == ModerationResult.FLAGGED
    assert "violence" in report.flagged_categories
    assert report.confidence == 0.91


# ──────────────────────────────────────────────
# TC-027-03: Nhiều vi phạm cùng lúc
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_multiple_violations(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"

    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value = _mock_gemini_response(
        result="flagged",
        reason="Nhiều loại vi phạm",
        categories=["violence", "hate_speech"],
        confidence=0.99,
    )
    mock_model.return_value = mock_gemini

    report = moderate_content("...", chapter_id="chap-003")

    assert report.result == ModerationResult.FLAGGED
    assert len(report.flagged_categories) == 2
    assert "hate_speech" in report.flagged_categories


# ──────────────────────────────────────────────
# TC-027-04: Gemini trả về JSON lỗi → ERROR
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_invalid_json(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"

    mock_gemini = MagicMock()
    mock_gemini.generate_content.return_value.text = "không phải JSON {{{invalid"
    mock_model.return_value = mock_gemini

    report = moderate_content("nội dung bất kỳ", chapter_id="chap-004")

    assert report.result == ModerationResult.ERROR
    assert report.flagged_categories == []


# ──────────────────────────────────────────────
# TC-027-05: Gemini API down → ERROR (fallback an toàn)
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
@patch("app.services.moderation_service._get_gemini_model")
def test_moderate_content_gemini_api_down(mock_model, mock_settings):
    mock_settings.GEMINI_API_KEY = "fake-key"

    mock_gemini = MagicMock()
    mock_gemini.generate_content.side_effect = Exception("503 Service Unavailable")
    mock_model.return_value = mock_gemini

    report = moderate_content("nội dung bất kỳ", chapter_id="chap-005")

    assert report.result == ModerationResult.ERROR
    assert "503" in report.reason


# ──────────────────────────────────────────────
# TC-027-06: API key chưa cấu hình → auto APPROVED
# ──────────────────────────────────────────────

@patch("app.services.moderation_service.settings")
def test_moderate_content_no_api_key(mock_settings):
    mock_settings.GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE"

    report = moderate_content("bất kỳ nội dung", chapter_id="chap-006")

    assert report.result == ModerationResult.APPROVED
    assert report.confidence == 1.0


# ──────────────────────────────────────────────
# TC-027-07: apply_moderation_result — APPROVED → published
# ──────────────────────────────────────────────

def test_apply_result_approved(caplog):
    import logging
    report = ModerationReport(
        result=ModerationResult.APPROVED,
        reason="Nội dung sạch",
        flagged_categories=[],
        confidence=0.95,
    )
    with caplog.at_level(logging.INFO, logger="app.services.moderation_service"):
        apply_moderation_result("chap-001", report, db=MagicMock())

    assert "published" in caplog.text


# ──────────────────────────────────────────────
# TC-027-08: apply_moderation_result — FLAGGED → flagged
# ──────────────────────────────────────────────

def test_apply_result_flagged(caplog):
    import logging
    report = ModerationReport(
        result=ModerationResult.FLAGGED,
        reason="Vi phạm bạo lực",
        flagged_categories=["violence"],
        confidence=0.88,
    )
    with caplog.at_level(logging.INFO, logger="app.services.moderation_service"):
        apply_moderation_result("chap-002", report, db=MagicMock())

    assert "flagged" in caplog.text


# ──────────────────────────────────────────────
# TC-027-09: apply_moderation_result — ERROR → draft
# ──────────────────────────────────────────────

def test_apply_result_error(caplog):
    import logging
    report = ModerationReport(
        result=ModerationResult.ERROR,
        reason="Gemini API lỗi",
        flagged_categories=[],
        confidence=0.0,
    )
    with caplog.at_level(logging.INFO, logger="app.services.moderation_service"):
        apply_moderation_result("chap-003", report, db=MagicMock())

    assert "draft" in caplog.text


# ──────────────────────────────────────────────
# TC-027-10: Worker tích hợp U005 + U013
# ──────────────────────────────────────────────

@patch("app.worker.main.apply_moderation_result")
@patch("app.worker.main.moderate_content")
def test_worker_calls_moderation_on_publish(mock_moderate, mock_apply):
    """Đảm bảo worker gọi moderate_content khi nhận task publish_chapter."""
    from app.worker.main import handle_publish_chapter

    mock_moderate.return_value = ModerationReport(
        result=ModerationResult.APPROVED,
        reason="OK",
        flagged_categories=[],
        confidence=0.99,
    )

    handle_publish_chapter({
        "task_type": "publish_chapter",
        "chapter_id": "chap-001",
        "requested_by": "user-abc",
    })

    mock_moderate.assert_called_once()
    mock_apply.assert_called_once()
    # Đảm bảo chapter_id được truyền đúng
    call_kwargs = mock_moderate.call_args
    assert call_kwargs.kwargs.get("chapter_id") == "chap-001" or \
           call_kwargs.args[1] == "chap-001"


@patch("app.worker.main.apply_moderation_result")
@patch("app.worker.main.moderate_content")
def test_worker_handles_flagged_chapter(mock_moderate, mock_apply):
    """Khi chapter bị flag, worker vẫn chạy không crash."""
    from app.worker.main import handle_publish_chapter

    mock_moderate.return_value = ModerationReport(
        result=ModerationResult.FLAGGED,
        reason="Bạo lực",
        flagged_categories=["violence"],
        confidence=0.95,
    )

    # Không raise exception
    handle_publish_chapter({
        "task_type": "publish_chapter",
        "chapter_id": "chap-flagged",
        "requested_by": "user-abc",
    })

    mock_apply.assert_called_once()