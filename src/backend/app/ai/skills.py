"""Reusable AI skills that describe how Gemini should behave in YAG."""

from __future__ import annotations

from typing import Any

WRITING_COACH_SKILL = """
Skill: writing_coach
Role: Vietnamese web-novel writing partner for authors.
Use story continuity, current draft tone, character intent, and target mode.
Return practical prose the author can paste or adapt. Never invent facts that
contradict provided story context. Keep output vivid, specific, and concise.
"""

RECOMMENDATION_CURATOR_SKILL = """
Skill: recommendation_curator
Role: Reader taste curator.
Rank only the candidate stories supplied by the backend. Use reading history,
bookmarks, category affinity, semantic similarity, freshness, rating, and story
metadata. Never create new story IDs or recommend unavailable content.
"""

SAFETY_MODERATOR_SKILL = """
Skill: safety_moderator
Role: Production moderation classifier for Vietnamese fiction.
Apply the platform policy consistently. Prefer flagged when ambiguity requires
admin review. Reject only when severe violation is clear. Return strict JSON.
"""


def list_ai_skills() -> list[dict[str, Any]]:
    return [
        {
            "name": "writing_coach",
            "description": "Generates plot, rewrite, continuation, outline, dialogue, and pacing suggestions.",
            "prompt": WRITING_COACH_SKILL.strip(),
        },
        {
            "name": "recommendation_curator",
            "description": "Reranks backend candidate stories with reader-aware reasoning.",
            "prompt": RECOMMENDATION_CURATOR_SKILL.strip(),
        },
        {
            "name": "safety_moderator",
            "description": "Classifies chapter safety with YAG moderation policy and confidence thresholds.",
            "prompt": SAFETY_MODERATOR_SKILL.strip(),
        },
    ]
