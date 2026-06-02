import json
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

import google.generativeai as genai

from app.core.config import settings
from app.models.ai_moderation_log import AIModerationLog
from app.models.chapter import Chapter

logger = logging.getLogger(__name__)


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


def _get_gemini_model():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")


MODERATION_PROMPT = """
You are the automated safety moderation system for YAG, a Vietnamese web novel
platform. Analyze the chapter content against these policy areas:

- Vietnamese cultural decency and illegal/offensive content.
- Extreme graphic violence, gore, torture, or cruelty.
- Hate speech, harassment, dehumanization, or discriminatory attacks.
- Sexual or pornographic content, especially sensitive or exploitative content.
- Child safety risks.

Return strict JSON only, with no markdown:
{{
  "result": "approved" | "rejected" | "flagged",
  "reason": "short specific reason",
  "flagged_categories": ["violence", "hate_speech", "sexual_content", "cultural_violation", "child_safety"],
  "confidence_score": 0.0
}}

Use "approved" when the chapter is safe. Use "flagged" when it needs admin
review. Use "rejected" when the violation is clear and severe.

Chapter content:
\"\"\"
{content}
\"\"\"
"""


def _extract_json(text: str) -> dict:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start != -1 and end != -1:
        stripped = stripped[start : end + 1]

    return json.loads(stripped)


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


def moderate_content(content: str, chapter_id: str) -> ModerationReport:
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        logger.warning("GEMINI_API_KEY is not configured; auto-approving chapter %s", chapter_id)
        return ModerationReport(
            result=ModerationResult.APPROVED,
            reason="Gemini API key is not configured; moderation skipped in local mode.",
            flagged_categories=[],
            confidence=1.0,
        )

    try:
        model = _get_gemini_model()
        prompt = MODERATION_PROMPT.format(content=content[:12000])
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        parsed = _extract_json(raw_text)

        categories = parsed.get("flagged_categories") or []
        if isinstance(categories, str):
            categories = [categories]

        report = ModerationReport(
            result=_normalize_result(parsed.get("result")),
            reason=parsed.get("reason", ""),
            flagged_categories=[str(category) for category in categories],
            confidence=_clamp_confidence(parsed.get("confidence_score", parsed.get("confidence"))),
            raw_response=raw_text,
        )
        logger.info(
            "Moderation result for chapter %s: %s confidence=%.2f",
            chapter_id,
            report.result.value,
            report.confidence,
        )
        return report
    except json.JSONDecodeError as exc:
        logger.error("Gemini returned invalid JSON for chapter %s: %s", chapter_id, exc)
        return ModerationReport(
            result=ModerationResult.ERROR,
            reason=f"Gemini response is not valid JSON: {exc}",
            flagged_categories=[],
            confidence=0.0,
        )
    except Exception as exc:
        logger.error("Gemini moderation failed for chapter %s: %s", chapter_id, exc)
        return ModerationReport(
            result=ModerationResult.ERROR,
            reason=f"Gemini API error: {exc}",
            flagged_categories=[],
            confidence=0.0,
        )


def apply_moderation_result(chapter_id: str, report: ModerationReport, db) -> Chapter:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise LookupError(f"Chapter {chapter_id} not found")

    if report.result == ModerationResult.ERROR:
        chapter.moderation_status = "pending"
    else:
        chapter.moderation_status = report.result.value

    categories = [str(category) for category in report.flagged_categories]
    log = AIModerationLog(
        chapter_id=chapter.id,
        is_violation=report.result in {ModerationResult.REJECTED, ModerationResult.FLAGGED},
        violation_category=", ".join(categories)[:50] if categories else None,
        confidence_score=report.confidence,
        reason=report.reason,
    )

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
