"""Typed server-side tools available to the YAG AI agent."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text

from app.core.config import settings
from app.ai.skills import list_ai_skills

logger = logging.getLogger(__name__)


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


def result_rows(result: Any) -> list[dict[str, Any]]:
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


def safe_truncate(value: str | None, limit: int | None = None) -> str:
    if not value:
        return ""
    max_chars = limit or settings.AI_MAX_CONTEXT_CHARS
    text_value = str(value).strip()
    if len(text_value) <= max_chars:
        return text_value
    return text_value[-max_chars:].strip()


def get_story_context(
    db: Any,
    *,
    story_id: str | None = None,
    chapter_id: str | None = None,
) -> dict[str, Any]:
    """Fetch a compact context bundle for the writing agent."""

    if db is None or (not story_id and not chapter_id):
        return {}

    try:
        if chapter_id:
            result = db.execute(
                text("""
                    SELECT
                        c.id AS chapter_id,
                        c.title AS chapter_title,
                        c.chapter_number,
                        c.content AS current_chapter_content,
                        c.moderation_status,
                        s.id AS story_id,
                        s.title AS story_title,
                        s.description,
                        s.category,
                        s.tags,
                        s.main_characters,
                        s.target_audience,
                        s.status
                    FROM chapters AS c
                    JOIN stories AS s ON s.id = c.story_id
                    WHERE c.id = :chapter_id
                    LIMIT 1
                    """),
                {"chapter_id": chapter_id},
            )
            rows = result_rows(result)
            if rows:
                story_id = str(rows[0].get("story_id") or story_id or "")
                story = rows[0]
            else:
                story = {}
        else:
            result = db.execute(
                text("""
                    SELECT
                        s.id AS story_id,
                        s.title AS story_title,
                        s.description,
                        s.category,
                        s.tags,
                        s.main_characters,
                        s.target_audience,
                        s.status
                    FROM stories AS s
                    WHERE s.id = :story_id
                    LIMIT 1
                    """),
                {"story_id": story_id},
            )
            story_rows = result_rows(result)
            story = story_rows[0] if story_rows else {}

        recent_rows: list[dict[str, Any]] = []
        if story_id:
            result = db.execute(
                text("""
                    SELECT
                        c.id AS chapter_id,
                        c.chapter_number,
                        c.title,
                        c.content,
                        c.moderation_status
                    FROM chapters AS c
                    WHERE c.story_id = :story_id
                    ORDER BY c.chapter_number DESC
                    LIMIT 5
                    """),
                {"story_id": story_id},
            )
            recent_rows = result_rows(result)

        recent_chapters = [
            {
                "chapter_id": str(row.get("chapter_id", "")),
                "chapter_number": row.get("chapter_number"),
                "title": row.get("title"),
                "moderation_status": row.get("moderation_status"),
                "excerpt": safe_truncate(str(row.get("content") or ""), 1200),
            }
            for row in recent_rows
        ]
        return {
            "story": {
                "story_id": str(story.get("story_id") or story_id or ""),
                "title": story.get("story_title"),
                "description": safe_truncate(story.get("description"), 1600),
                "category": story.get("category"),
                "tags": story.get("tags"),
                "main_characters": story.get("main_characters"),
                "target_audience": story.get("target_audience"),
                "status": story.get("status"),
            },
            "current_chapter": {
                "chapter_id": str(story.get("chapter_id") or chapter_id or ""),
                "title": story.get("chapter_title"),
                "chapter_number": story.get("chapter_number"),
                "moderation_status": story.get("moderation_status"),
                "excerpt": safe_truncate(
                    story.get("current_chapter_content"), settings.AI_MAX_CONTEXT_CHARS
                ),
            },
            "recent_chapters": recent_chapters,
        }
    except Exception as exc:  # pragma: no cover - production defensive path
        logger.warning("AI story context tool failed: %s", type(exc).__name__)
        return {}


def get_author_style_profile(context: dict[str, Any]) -> dict[str, Any]:
    chapters = context.get("recent_chapters") or []
    excerpts = [str(chapter.get("excerpt") or "") for chapter in chapters]
    joined = " ".join(excerpts).strip()
    if not joined:
        return {
            "voice": "Vietnamese web novel prose",
            "density": "balanced",
            "dialogue_ratio": "unknown",
        }

    dialogue_marks = joined.count('"') + joined.count("'")
    sentence_count = max(1, joined.count(".") + joined.count("!") + joined.count("?"))
    avg_sentence_words = len(joined.split()) / sentence_count
    return {
        "voice": "inferred from recent chapters",
        "density": "lyrical" if avg_sentence_words > 24 else "direct",
        "dialogue_ratio": "high" if dialogue_marks >= 8 else "moderate",
        "avg_sentence_words": round(avg_sentence_words, 1),
    }


def get_reader_profile(db: Any, user_id: str) -> dict[str, Any]:
    if db is None:
        return {"user_id": user_id, "seen_story_ids": [], "preferred_categories": []}

    try:
        result = db.execute(
            text("""
                SELECT DISTINCT
                    s.id AS story_id,
                    s.title,
                    s.category,
                    'history' AS source
                FROM reading_histories AS rh
                JOIN chapters AS c ON c.id = rh.chapter_id
                JOIN stories AS s ON s.id = c.story_id
                WHERE rh.user_id = :user_id

                UNION

                SELECT DISTINCT
                    s.id AS story_id,
                    s.title,
                    s.category,
                    'library' AS source
                FROM libraries AS l
                JOIN stories AS s ON s.id = l.story_id
                WHERE l.user_id = :user_id
                """),
            {"user_id": user_id},
        )
        rows = result_rows(result)
    except Exception as exc:  # pragma: no cover - production defensive path
        logger.warning("AI reader profile tool failed: %s", type(exc).__name__)
        rows = []

    categories: dict[str, int] = {}
    for row in rows:
        category = str(row.get("category") or "").strip()
        if category:
            categories[category] = categories.get(category, 0) + 1

    return {
        "user_id": user_id,
        "seen_story_ids": [
            str(row.get("story_id")) for row in rows if row.get("story_id")
        ],
        "preferred_categories": sorted(
            categories, key=lambda category: categories[category], reverse=True
        ),
        "signals": rows[:20],
    }


def get_moderation_policy() -> dict[str, Any]:
    return {
        "categories": [
            "violence",
            "hate_speech",
            "sexual_content",
            "cultural_violation",
            "child_safety",
            "spam",
        ],
        "approve_threshold": settings.AI_MODERATION_APPROVE_THRESHOLD,
        "reject_threshold": settings.AI_MODERATION_REJECT_THRESHOLD,
        "strict_mode": settings.AI_MODERATION_STRICT_MODE,
    }


def list_tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "name": "get_story_context",
            "description": "Fetch story metadata, current chapter, and recent continuity.",
            "allowed_roles": ["author", "admin"],
            "input_schema": {"story_id": "string?", "chapter_id": "string?"},
            "output_schema": {"story": "object", "current_chapter": "object"},
        },
        {
            "name": "get_recent_chapters",
            "description": "Included in get_story_context as recent chapter excerpts.",
            "allowed_roles": ["author", "admin"],
            "input_schema": {"story_id": "string"},
            "output_schema": {"recent_chapters": "array"},
        },
        {
            "name": "get_author_style_profile",
            "description": "Infer lightweight style signals from recent chapter excerpts.",
            "allowed_roles": ["author", "admin"],
            "input_schema": {"context": "object"},
            "output_schema": {"voice": "string", "density": "string"},
        },
        {
            "name": "semantic_story_search",
            "description": "Retrieve pgvector story candidates for search and recommendations.",
            "allowed_roles": ["reader", "author", "admin"],
            "input_schema": {"query": "string", "limit": "integer"},
            "output_schema": {"candidates": "array"},
        },
        {
            "name": "get_reader_profile",
            "description": "Collect reading history and library signals for recommendations.",
            "allowed_roles": ["reader", "admin"],
            "input_schema": {"user_id": "string"},
            "output_schema": {"seen_story_ids": "array", "preferred_categories": "array"},
        },
        {
            "name": "get_moderation_policy",
            "description": "Return YAG safety categories and moderation thresholds.",
            "allowed_roles": ["admin", "worker"],
            "input_schema": {},
            "output_schema": {"categories": "array", "approve_threshold": "number"},
        },
    ]


def build_mcp_manifest() -> dict[str, Any]:
    return {
        "name": "yag-ai-agent",
        "version": "1.0.0",
        "description": "MCP-compatible manifest for YAG Gemini agent tools and skills.",
        "provider": "gemini",
        "tools": list_tool_definitions(),
        "skills": list_ai_skills(),
        "execution": {
            "public_tool_execution": False,
            "authentication": "required",
            "notes": "Tools are executed only inside authenticated backend workflows.",
        },
    }
