"""
U013 - Moderation Service: Kiểm duyệt nội dung chương truyện bằng Gemini AI.
Được gọi từ worker sau khi nhận task publish từ RabbitMQ queue.
"""
import json
import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Enums & Data Classes
# ──────────────────────────────────────────────

class ModerationResult(str, Enum):
    APPROVED  = "approved"   # Nội dung sạch → cho phép xuất bản
    FLAGGED   = "flagged"    # Nội dung vi phạm → chờ admin duyệt thủ công
    ERROR     = "error"      # Gemini lỗi → fallback an toàn, giữ nguyên


@dataclass
class ModerationReport:
    result: ModerationResult
    reason: str
    flagged_categories: list[str]   # Ví dụ: ["violence", "sexual_content"]
    confidence: float               # 0.0 → 1.0
    raw_response: Optional[str] = None


# ──────────────────────────────────────────────
# Gemini Client Setup
# ──────────────────────────────────────────────

def _get_gemini_model():
    """Khởi tạo Gemini model từ API key trong config."""
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")


MODERATION_PROMPT = """
Bạn là hệ thống kiểm duyệt nội dung tự động cho nền tảng đọc truyện.
Hãy phân tích đoạn văn bản sau và trả về JSON với cấu trúc chính xác như sau:

{{
  "result": "approved" hoặc "flagged",
  "reason": "Mô tả ngắn lý do",
  "flagged_categories": ["danh sách vi phạm, để [] nếu không có"],
  "confidence": số thực từ 0.0 đến 1.0
}}

Các danh mục vi phạm cần kiểm tra:
- violence: Bạo lực, máu me, tra tấn
- sexual_content: Nội dung tình dục
- hate_speech: Ngôn từ thù địch, phân biệt đối xử
- child_safety: Nội dung có hại cho trẻ em
- spam: Spam, quảng cáo trá hình

Chỉ trả về JSON thuần túy, không có markdown, không có giải thích thêm.

Nội dung cần kiểm duyệt:
\"\"\"
{content}
\"\"\"
"""


# ──────────────────────────────────────────────
# Core Moderation Logic
# ──────────────────────────────────────────────

def moderate_content(content: str, chapter_id: str) -> ModerationReport:
    """
    Gửi nội dung đến Gemini để kiểm duyệt.

    Args:
        content:    Nội dung chapter cần kiểm duyệt
        chapter_id: ID chapter (dùng cho logging)

    Returns:
        ModerationReport với kết quả approved/flagged/error
    """
    if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
        logger.warning(f"[U013] GEMINI_API_KEY chưa cấu hình — auto approve chapter {chapter_id}")
        return ModerationReport(
            result=ModerationResult.APPROVED,
            reason="Gemini API key chưa cấu hình, bỏ qua kiểm duyệt",
            flagged_categories=[],
            confidence=1.0,
        )

    try:
        model = _get_gemini_model()
        prompt = MODERATION_PROMPT.format(content=content[:4000])  # Giới hạn 4000 ký tự

        logger.info(f"[U013] Gửi nội dung chapter {chapter_id} đến Gemini...")
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        # Parse JSON response từ Gemini
        parsed = json.loads(raw_text)

        result = ModerationResult(parsed.get("result", "error"))
        report = ModerationReport(
            result=result,
            reason=parsed.get("reason", ""),
            flagged_categories=parsed.get("flagged_categories", []),
            confidence=float(parsed.get("confidence", 0.0)),
            raw_response=raw_text,
        )

        logger.info(
            f"[U013] Kết quả kiểm duyệt chapter {chapter_id}: "
            f"{result.value} (confidence={report.confidence:.2f})"
        )
        return report

    except json.JSONDecodeError as e:
        logger.error(f"[U013] Gemini trả về JSON không hợp lệ cho chapter {chapter_id}: {e}")
        return ModerationReport(
            result=ModerationResult.ERROR,
            reason=f"Gemini response không parse được: {e}",
            flagged_categories=[],
            confidence=0.0,
        )
    except Exception as e:
        logger.error(f"[U013] Lỗi khi gọi Gemini cho chapter {chapter_id}: {e}")
        return ModerationReport(
            result=ModerationResult.ERROR,
            reason=f"Gemini API lỗi: {e}",
            flagged_categories=[],
            confidence=0.0,
        )


# ──────────────────────────────────────────────
# DB Status Update (sau khi có kết quả kiểm duyệt)
# ──────────────────────────────────────────────

def apply_moderation_result(chapter_id: str, report: ModerationReport, db) -> None:
    """
    Cập nhật trạng thái chapter trong DB dựa theo kết quả kiểm duyệt.

    - APPROVED → status = "published"
    - FLAGGED  → status = "flagged" (chờ admin xử lý thủ công)
    - ERROR    → status = "draft"   (giữ nguyên, retry sau)

    TODO: Thay bằng query thật khi có model Chapter:
        from app.models.chapter import Chapter
        chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
        chapter.status = status_map[report.result]
        chapter.moderation_reason = report.reason
        chapter.moderation_categories = report.flagged_categories
        db.commit()
    """
    status_map = {
        ModerationResult.APPROVED: "published",
        ModerationResult.FLAGGED:  "flagged",
        ModerationResult.ERROR:    "draft",
    }
    new_status = status_map[report.result]
    logger.info(
        f"[U013] Cập nhật chapter {chapter_id}: "
        f"{report.result.value} → status='{new_status}' | reason: {report.reason}"
    )