"""
Gemini-powered AI services for U006, U008 and U009.
"""
from __future__ import annotations

import json
import logging
import re
import unicodedata
from typing import Any, Iterable

import httpx
from sqlalchemy import text

from app.core.config import settings
from app.schemas.ai import (
    AISuggestionItem,
    AISuggestionRequest,
    AISuggestionResponse,
    AiMode,
)

logger = logging.getLogger(__name__)

DEFAULT_MODE: AiMode = "kịch tính"

MODE_ALIASES: dict[str, AiMode] = {
    "kich tinh": "kịch tính",
    "kịch tính": "kịch tính",
    "dramatic": "kịch tính",
    "lang man": "lãng mạn",
    "lãng mạn": "lãng mạn",
    "romance": "lãng mạn",
    "bi an": "bí ẩn",
    "bí ẩn": "bí ẩn",
    "mystery": "bí ẩn",
    # Backward compatibility with older fixtures using mojibake strings.
    "kÃ¡Â»â€¹ch tÃƒÂ­nh": "kịch tính",
    "ká»‹ch tÃ­nh": "kịch tính",
    "lÃƒÂ£ng mÃ¡ÂºÂ¡n": "lãng mạn",
    "lÃ£ng máº¡n": "lãng mạn",
    "bÃƒÂ­ Ã¡ÂºÂ©n": "bí ẩn",
    "bÃ­ áº©n": "bí ẩn",
}

FALLBACK_LIBRARY: dict[AiMode, list[tuple[str, str, str]]] = {
    "kịch tính": [
        (
            "Tăng áp lực ngay",
            "Cho nhân vật chính đối diện một lượt phản công bắt buộc.",
            "Giữ nhịp nhanh và đẩy xung đột lên cao.",
        ),
        (
            "Lật ngược ưu thế",
            "Đặt một chi tiết mới khiến tình thế từ lợi thành bất lợi.",
            "Tạo cú bước ngoặt mạnh mẽ.",
        ),
        (
            "Kết bằng một đe doạ",
            "Khép cảnh bằng dấu hiệu cho thấy nguy cơ vẫn chưa chấm dứt.",
            "Giữ độ dở dang cho chương sau.",
        ),
    ],
    "lãng mạn": [
        (
            "Để cảm xúc chạm nhau",
            "Cho hai nhân vật vừa hiểu lầm vừa muốn lại gần nhau hơn.",
            "Tăng độ rung cảm và gần gũi.",
        ),
        (
            "Một chi tiết nhỏ riêng tư",
            "Đưa vào một cử chỉ chân thật chỉ hai người hiểu.",
            "Làm nổi bật sự tinh tế của mối quan hệ.",
        ),
        (
            "Khép cảnh bằng một lời chưa nói",
            "Để câu quan trọng nhất dừng lại ngay trước khi được thốt ra.",
            "Giữ dư âm nhẹ nhàng và tiếc nuối.",
        ),
    ],
    "bí ẩn": [
        (
            "Cài một manh mối lệch",
            "Thêm một chi tiết nhỏ nhưng phá vỡ logic bề mặt.",
            "Kéo độc giả vào việc suy đoán.",
        ),
        (
            "Một người xuất hiện sai lúc",
            "Cho một nhân vật phụ có hành vi không khớp với lời nói.",
            "Tạo cảm giác có điều bị che giấu.",
        ),
        (
            "Đóng cảnh bằng khoảng trống",
            "Kết chương bằng một phát hiện chưa đủ để giải thích mọi thứ.",
            "Giữ độ tò mò cho chương sau.",
        ),
    ],
}


def _normalize_mode_key(mode: str) -> str:
    normalized = re.sub(r"\s+", " ", mode.strip().lower())
    return normalized


def normalize_mode(mode: str) -> AiMode:
    normalized = _normalize_mode_key(mode)
    if normalized in MODE_ALIASES:
        return MODE_ALIASES[normalized]

    folded = unicodedata.normalize("NFKD", normalized).encode("ascii", "ignore").decode("ascii")
    if folded in MODE_ALIASES:
        return MODE_ALIASES[folded]

    return DEFAULT_MODE


def truncate_context(context: str, limit_words: int) -> str:
    words = context.split()
    if len(words) <= limit_words:
        return context.strip()
    return " ".join(words[-limit_words:]).strip()


def _clamp_similarity(distance: float) -> float:
    return max(0.0, min(1.0, 1.0 - distance))


def _format_vector_literal(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{float(value):.8f}" for value in values) + "]"


def _row_to_dict(row: Any) -> dict[str, Any]:
    if row is None:
        return {}
    if isinstance(row, dict):
        return row
    mapping = getattr(row, "_mapping", None)
    if mapping is not None:
        return dict(mapping)
    if hasattr(row, "keys"):
        try:
            return {key: row[key] for key in row.keys()}
        except Exception:  # pragma: no cover - defensive
            pass
    if isinstance(row, (list, tuple)):
        return {str(index): value for index, value in enumerate(row)}
    return {"value": row}


def _result_rows(result: Any) -> list[dict[str, Any]]:
    if result is None:
        return []

    if hasattr(result, "mappings"):
        try:
            return [dict(row) for row in result.mappings().all()]
        except Exception:  # pragma: no cover - defensive
            pass

    if hasattr(result, "all"):
        try:
            rows = result.all()
        except Exception:  # pragma: no cover - defensive
            rows = list(result)
    elif isinstance(result, list):
        rows = result
    else:
        rows = list(result)

    return [_row_to_dict(row) for row in rows]


def build_prompt(request: AISuggestionRequest, context: str) -> tuple[str, str]:
    system_prompt = (
        "You are Miu AI, a senior literary editor who understands reader psychology and writes with high literary quality. "
        "Analyze the story flow and the current tone, then return exactly 3 concise plot suggestions. "
        "Return JSON only with this shape: "
        '{"suggestions":[{"title":"...","content":"..."}]}. '
        "Do not include markdown, bullet lists, explanations, or any text outside JSON."
    )
    user_prompt = (
        f"Mode: {request.mode}\n"
        f"Story context:\n{context}\n\n"
        "Task:\n"
        "- Infer the current narrative direction and tone.\n"
        "- Produce exactly 3 short, compelling next-step plot suggestions in Vietnamese.\n"
        "- Each item must contain a title and a detailed paragraph.\n"
        "- Keep the suggestions practical enough for direct use in a draft."
    )
    return system_prompt, user_prompt


def extract_json_object(raw_text: str) -> dict[str, Any]:
    candidate_text = raw_text.strip()
    if candidate_text.startswith("```"):
        candidate_text = re.sub(r"^```(?:json)?\s*", "", candidate_text)
        candidate_text = re.sub(r"\s*```$", "", candidate_text)

    start = candidate_text.find("{")
    end = candidate_text.rfind("}")
    if start >= 0 and end > start:
        candidate_text = candidate_text[start : end + 1]

    data = json.loads(candidate_text)
    if not isinstance(data, dict):
        raise ValueError("Gemini response must be a JSON object")
    return data


def build_fallback_items(mode: AiMode) -> list[AISuggestionItem]:
    normalized_mode = normalize_mode(mode)
    return [
        AISuggestionItem(title=title, content=content, reason=reason)
        for title, content, reason in FALLBACK_LIBRARY[normalized_mode]
    ]


def normalize_suggestions(data: dict[str, Any], mode: AiMode) -> list[AISuggestionItem]:
    raw_suggestions = data.get("suggestions", [])
    suggestions: list[AISuggestionItem] = []
    for item in raw_suggestions:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title", "")).strip()
        content = str(item.get("content", "")).strip()
        if not title or not content:
            continue
        suggestions.append(
            AISuggestionItem(
                title=title,
                content=content,
                reason=(str(item.get("reason")).strip() or None) if item.get("reason") is not None else None,
            )
        )
        if len(suggestions) == 3:
            break

    if len(suggestions) < 3:
        suggestions.extend(build_fallback_items(mode)[len(suggestions) : 3])

    return suggestions[:3]


def build_fallback_response(request: AISuggestionRequest, message: str | None = None) -> AISuggestionResponse:
    mode = normalize_mode(request.mode)
    return AISuggestionResponse(
        chapter_id=request.chapter_id,
        mode=request.mode,
        provider="fallback",
        fallback=True,
        suggestions=build_fallback_items(mode),
        message=message or "Gemini is unavailable, so fallback suggestions were generated locally.",
    )


async def _gemini_post(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=settings.GEMINI_TIMEOUT_SECONDS) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def _generate_text_embedding(text: str) -> list[float]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("Gemini API key is missing.")

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_EMBEDDING_MODEL}:embedContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {"content": {"parts": [{"text": text}]} }
    data = await _gemini_post(url, payload)
    embedding = data.get("embedding") or {}
    values = embedding.get("values") or embedding.get("vector") or embedding.get("embedding")
    if not isinstance(values, list) or not values:
        raise ValueError("Gemini embedding response is invalid.")
    return [float(value) for value in values]


async def generate_ai_suggestions(request: AISuggestionRequest) -> AISuggestionResponse:
    context = truncate_context(request.context, settings.AI_CONTEXT_WORD_LIMIT)
    sanitized_request = AISuggestionRequest(
        chapter_id=request.chapter_id,
        context=context,
        mode=request.mode,
    )

    if not settings.GEMINI_API_KEY:
        return build_fallback_response(sanitized_request, "Gemini API key is missing.")

    system_prompt, user_prompt = build_prompt(sanitized_request, context)
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.8,
            "topP": 0.9,
            "maxOutputTokens": settings.GEMINI_MAX_OUTPUT_TOKENS,
            "responseMimeType": "application/json",
        },
    }

    try:
        data = await _gemini_post(url, payload)
    except (httpx.HTTPError, ValueError) as exc:
        logger.exception("Gemini request failed")
        return build_fallback_response(sanitized_request, str(exc))

    try:
        candidate = (data.get("candidates") or [])[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])
        raw_text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if not raw_text:
            raise ValueError("Gemini response was empty")

        parsed = extract_json_object(raw_text)
        suggestions = normalize_suggestions(parsed, normalize_mode(request.mode))
        return AISuggestionResponse(
            chapter_id=sanitized_request.chapter_id,
            mode=request.mode,
            provider="gemini",
            fallback=False,
            suggestions=suggestions,
            message=parsed.get("message") if isinstance(parsed.get("message"), str) else None,
        )
    except (IndexError, AttributeError, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        logger.exception("Gemini response parsing failed")
        return build_fallback_response(sanitized_request, str(exc))


def _build_search_item(row: dict[str, Any], query_vector: list[float] | None = None) -> AISemanticSearchItem:
    distance = float(row.get("distance", 0.0) or 0.0)
    if "similarity" in row:
        similarity = float(row.get("similarity") or 0.0)
    elif query_vector is not None and isinstance(row.get("embedding"), list):
        similarity = _clamp_similarity(distance)
    else:
        similarity = _clamp_similarity(distance)

    return AISemanticSearchItem(
        story_id=str(row.get("story_id", "")),
        title=str(row.get("title")) if row.get("title") is not None else None,
        plot_summary=str(row.get("plot_summary", "")),
        distance=distance,
        similarity=similarity,
    )


