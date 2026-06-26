import json
import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from app.ai.gateway import (
    GeminiGateway,
    GeminiGatewayError,
    GeminiResponseError,
    extract_json_object,
    gemini_api_key_configured,
)
from app.ai.tools import get_moderation_policy, safe_truncate
from app.core.config import settings
from app.models.ai_moderation_log import AIModerationLog
from app.models.chapter import Chapter
from app.services.notification_service import notify_chapter_moderation_result

logger = logging.getLogger(__name__)

# Inline safety moderator prompt (formerly in skills.py)
SAFETY_MODERATOR_PROMPT = """
Nhiệm vụ: Kiểm duyệt nội dung tiểu thuyết mạng Việt Nam. Bạn là hệ thống kiểm duyệt chuyên nghiệp.

PHÂN LOẠI AN TOÀN (Safety Classification):

✅ APPROVED (Hợp lệ - cho phép xuất bản):
- Bạo lực tu tiên/kiếm hiệp/kỳ ảo: Cảnh chiến đấu, thi triển phép thuật, đâm chém trong bối cảnh võ hiệp/fantasy, hành động.
- Lãng mạn: Cảnh thân mật (ôm, hôn), cảm xúc lãng mạn, các tình tiết ngôn tình phổ biến, miễn không miêu tả chi tiết quan hệ tình dục.
- Kinh dị/Rùng rợn: Bối cảnh ma quái, quái vật, không gian u ám trong thể loại kinh dị.
- Xung đột tâm lý: Nhân vật trải qua đau khổ, mất mát, tranh đấu nội tâm.
HÃY MẶC ĐỊNH LÀ APPROVED CHO CÁC NỘI DUNG TIỂU THUYẾT THÔNG THƯỜNG.

❌ REJECTED (Vi phạm nghiêm trọng - từ chối):
- Bạo lực cực đoan thực tế: Miêu tả chi tiết tra tấn dã man, máu me phi nhân tính ở bối cảnh THỰC TẾ (không phải fantasy).
- Tình dục/Khiêu dâm: Miêu tả trực tiếp và chi tiết bộ phận sinh dục hoặc hành vi tình dục (18+), ấu dâm.
- Kích động thù hận: Nội dung phân biệt chủng tộc, giới tính, tôn giáo; kêu gọi bạo lực thực tế.
- Vi phạm chính trị/văn hóa Việt Nam: Nội dung chống phá nhà nước, xuyên tạc lịch sử, xúc phạm lãnh đạo.
- Hướng dẫn hoạt động phi pháp: Ma túy, vũ khí, hacking hệ thống thực.

⚠️ FLAGGED (Cần Admin xem xét):
- Nội dung cực kỳ nhạy cảm ở ranh giới mơ hồ giữa vi phạm và không vi phạm, mà bạn không thể tự quyết định.
- Ngôn ngữ thô tục quá mức, chửi rủa liên tục không vì mục đích nghệ thuật.

QUY TẮC QUYẾT ĐỊNH & LÝ DO (Reason):
- Luôn ưu tiên trả về "approved" nếu nội dung là tiểu thuyết hư cấu bình thường, dù có bạo lực nhẹ hoặc tình cảm.
- Trường "reason": BẮT BUỘC viết MỘT ĐOẠN NHẬN XÉT CHI TIẾT BẰNG TIẾNG VIỆT (ít nhất 2 câu) giải thích TẠI SAO truyện bị vi phạm hoặc TẠI SAO cần admin duyệt. Admin sẽ trực tiếp đọc đoạn này để đánh giá. Nếu là approved, có thể ghi ngắn gọn "Nội dung hợp lệ".
- Luôn trả về cấu trúc JSON hợp lệ.
""".strip()

MODERATION_SYSTEM_PROMPT = SAFETY_MODERATOR_PROMPT


class ModerationResult(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    FLAGGED = "flagged"
    ERROR = "error"


@dataclass
class ModerationReport:
    result: ModerationResult
    reason: str
    flagged_categories: list[str]
    confidence: float
    raw_response: Optional[str] = None


MODERATION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "result": {"type": "STRING"},
        "reason": {"type": "STRING"},
        "flagged_categories": {
            "type": "ARRAY",
            "items": {"type": "STRING"}
        },
        "confidence_score": {"type": "NUMBER"}
    },
    "required": ["result", "reason", "flagged_categories", "confidence_score"]
}



def _extract_json(text: str) -> dict:
    return extract_json_object(text)


def _normalize_result(value: str) -> ModerationResult:
    normalized = (value or "").strip().lower()
    if normalized == "approved":
        return ModerationResult.APPROVED
    if normalized == "rejected":
        return ModerationResult.REJECTED
    if normalized == "flagged":
        return ModerationResult.FLAGGED
    return ModerationResult.ERROR


def _clamp_confidence(value) -> float:
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    return min(1.0, max(0.0, confidence))


def _normal_categories(value) -> list[str]:
    if isinstance(value, str):
        raw_categories = [value]
    elif isinstance(value, list):
        raw_categories = value
    else:
        raw_categories = []
    return [str(category).strip() for category in raw_categories if str(category).strip()]


def _policy_report(
    result: ModerationResult,
    reason: str,
    categories: list[str],
    confidence: float,
) -> ModerationReport:
    return ModerationReport(
        result=result,
        reason=reason,
        flagged_categories=categories,
        confidence=confidence,
    )


def _pre_screen(content: str) -> ModerationReport | None:
    normalized = re.sub(r"\s+", " ", content or "").strip()
    if not normalized:
        return _policy_report(
            ModerationResult.REJECTED,
            "Chapter content is empty.",
            ["spam"],
            1.0,
        )

    lower_content = normalized.lower()
    if len(re.findall(r"https?://", lower_content)) >= 5:
        return _policy_report(
            ModerationResult.FLAGGED,
            "Content contains excessive external links.",
            ["spam"],
            0.92,
        )

    child_safety_terms = (
        "child sexual",
        "sexualized minor",
        "lạm dụng trẻ",
        "ấu dâm",
    )
    if any(term in lower_content for term in child_safety_terms):
        return _policy_report(
            ModerationResult.REJECTED,
            "Clear child-safety risk detected by policy pre-screen.",
            ["child_safety"],
            0.98,
        )

    hate_terms = (
        "diệt chủng",
        "exterminate all",
        "kill all",
    )
    if any(term in lower_content for term in hate_terms):
        return _policy_report(
            ModerationResult.FLAGGED,
            "Potential hate or mass-violence language requires admin review.",
            ["hate_speech"],
            0.88,
        )

    return None


def _apply_thresholds(report: ModerationReport) -> ModerationReport:
    if report.result == ModerationResult.ERROR:
        return ModerationReport(
            result=ModerationResult.FLAGGED,
            reason=report.reason or "Moderation result was invalid; admin review required.",
            flagged_categories=report.flagged_categories,
            confidence=report.confidence,
            raw_response=report.raw_response,
        )

    if (
        report.result == ModerationResult.APPROVED
        and report.confidence < settings.AI_MODERATION_APPROVE_THRESHOLD
    ):
        return ModerationReport(
            result=ModerationResult.FLAGGED,
            reason="Low-confidence approval requires admin review.",
            flagged_categories=report.flagged_categories,
            confidence=report.confidence,
            raw_response=report.raw_response,
        )

    if (
        report.result == ModerationResult.REJECTED
        and report.confidence < settings.AI_MODERATION_REJECT_THRESHOLD
    ):
        return ModerationReport(
            result=ModerationResult.FLAGGED,
            reason=report.reason or "Violation confidence requires admin review.",
            flagged_categories=report.flagged_categories,
            confidence=report.confidence,
            raw_response=report.raw_response,
        )

    return report


def _build_user_prompt(content: str) -> str:
    policy = get_moderation_policy()
    return (
        f"Policy:\n{json.dumps(policy, ensure_ascii=False)}\n\n"
        "Chapter content:\n"
        f'"""\n{safe_truncate(content, 12000)}\n"""'
    )


def moderate_content(content: str, chapter_id: str) -> ModerationReport:
    pre_screen = _pre_screen(content)
    if pre_screen is not None:
        logger.info(
            "Pre-screen moderation result for chapter %s: %s",
            chapter_id,
            pre_screen.result.value,
        )
        return pre_screen

    if not gemini_api_key_configured():
        if settings.ENVIRONMENT == "production":
            return ModerationReport(
                result=ModerationResult.ERROR,
                reason="Gemini API key is missing in production.",
                flagged_categories=[],
                confidence=0.0,
            )
        logger.warning(
            "GEMINI_API_KEY is not configured; auto-approving chapter %s in local mode",
            chapter_id,
        )
        return ModerationReport(
            result=ModerationResult.APPROVED,
            reason="Gemini API key is not configured; moderation skipped in local mode.",
            flagged_categories=[],
            confidence=1.0,
        )

    try:
        parsed, raw_text = GeminiGateway().generate_json_sync(
            system_prompt=MODERATION_SYSTEM_PROMPT,
            user_prompt=_build_user_prompt(content),
            temperature=0.0,
            max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
            model=settings.GEMINI_MODERATION_MODEL,
            response_schema=MODERATION_SCHEMA,
        )
    except (json.JSONDecodeError, GeminiResponseError, ValueError) as exc:
        logger.warning(
            "Gemini returned invalid moderation JSON for chapter %s: %s",
            chapter_id,
            type(exc).__name__,
        )
        return ModerationReport(
            result=ModerationResult.FLAGGED,
            reason="Gemini moderation response was invalid; admin review required.",
            flagged_categories=[],
            confidence=0.0,
        )
    except GeminiGatewayError as exc:
        logger.error("Gemini moderation API failed for chapter %s", chapter_id)
        return ModerationReport(
            result=ModerationResult.ERROR,
            reason=f"Gemini API error: {exc}",
            flagged_categories=[],
            confidence=0.0,
        )

    report = ModerationReport(
        result=_normalize_result(parsed.get("result")),
        reason=str(parsed.get("reason", "")).strip(),
        flagged_categories=_normal_categories(parsed.get("flagged_categories")),
        confidence=_clamp_confidence(
            parsed.get("confidence_score", parsed.get("confidence"))
        ),
        raw_response=raw_text,
    )
    normalized_report = _apply_thresholds(report)
    logger.info(
        "Moderation result for chapter %s: %s confidence=%.2f",
        chapter_id,
        normalized_report.result.value,
        normalized_report.confidence,
    )
    return normalized_report


def apply_moderation_result(chapter_id: str, report: ModerationReport, db) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise LookupError(f"Chapter {chapter_id} not found")

    if report.result == ModerationResult.ERROR:
        chapter.moderation_status = "pending"
    else:
        previous_status = chapter.moderation_status
        chapter.moderation_status = report.result.value
        notify_chapter_moderation_result(db, chapter, previous_status, chapter.moderation_status)

    categories = [str(category) for category in report.flagged_categories]
    log = (
        db.query(AIModerationLog)
        .filter(AIModerationLog.chapter_id == chapter.id)
        .first()
    )
    if log is None:
        log = AIModerationLog(chapter_id=chapter.id)

    log.is_violation = report.result in {
        ModerationResult.REJECTED,
        ModerationResult.FLAGGED,
    }
    log.violation_category = ", ".join(categories)[:50] if categories else None
    log.confidence_score = report.confidence
    log.reason = safe_truncate(report.reason, 2000)
    log.model_name = settings.GEMINI_MODERATION_MODEL
    log.raw_response = {
        "result": report.result.value,
        "flagged_categories": categories,
        "confidence_score": report.confidence,
    }

    db.add(chapter)
    db.add(log)
    db.commit()
    db.refresh(chapter)

    logger.info(
        "Chapter %s moderation_status=%s logged violation=%s",
        chapter_id,
        chapter.moderation_status,
        log.is_violation,
    )
    return chapter
