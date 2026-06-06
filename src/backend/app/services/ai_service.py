"""Gemini-powered AI services for U006, U008 and U009."""

from __future__ import annotations

import logging
from typing import Any, Iterable

from sqlalchemy import text

from app.ai.gateway import GeminiGateway
from app.ai.orchestrator import (
    DEFAULT_MODE,
    FALLBACK_LIBRARY,
    MODE_ALIASES,
    RecommendationAgent,
    WritingAgent,
    build_fallback_items,
    build_fallback_response,
    build_recommendation_item,
    normalize_mode,
    normalize_suggestions,
    truncate_context,
)
from app.ai.tools import result_rows
from app.core.config import settings
from app.schemas.ai import (
    AIRecommendationResponse,
    AISemanticSearchItem,
    AISemanticSearchRequest,
    AISemanticSearchResponse,
    AISuggestionRequest,
    AISuggestionResponse,
)

logger = logging.getLogger(__name__)

__all__ = [
    "DEFAULT_MODE",
    "FALLBACK_LIBRARY",
    "MODE_ALIASES",
    "build_fallback_items",
    "build_fallback_response",
    "generate_ai_suggestions",
    "normalize_mode",
    "normalize_suggestions",
    "recommend_stories_for_user",
    "search_stories_semantic",
    "sync_story_embedding",
    "truncate_context",
]


def _clamp_similarity(distance: float) -> float:
    return max(0.0, min(1.0, 1.0 - distance))


def _format_vector_literal(values: Iterable[float]) -> str:
    return "[" + ",".join(f"{float(value):.8f}" for value in values) + "]"


def _build_search_item(
    row: dict[str, Any], query_vector: list[float] | None = None
) -> AISemanticSearchItem:
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


async def generate_ai_suggestions(
    request: AISuggestionRequest, db: Any = None
) -> AISuggestionResponse:
    return await WritingAgent().generate(request, db=db)


async def _generate_text_embedding(value: str) -> list[float]:
    return await GeminiGateway().embed_text(value)


async def search_stories_semantic(
    db: Any, request: AISemanticSearchRequest
) -> AISemanticSearchResponse:
    query = request.query.strip()
    limit = request.limit

    try:
        query_vector = await _generate_text_embedding(query)
        query_vector_literal = _format_vector_literal(query_vector)
        result = db.execute(
            text("""
                SELECT
                    se.story_id,
                    s.title,
                    se.plot_summary,
                    (se.embedding <=> CAST(:query_vector AS vector)) AS distance
                FROM story_embeddings AS se
                LEFT JOIN stories AS s ON s.id = se.story_id
                WHERE EXISTS (
                    SELECT 1
                    FROM chapters AS c
                    WHERE c.story_id = s.id
                      AND c.moderation_status = 'approved'
                )
                ORDER BY distance ASC
                LIMIT :limit
                """),
            {"query_vector": query_vector_literal, "limit": limit},
        )
        rows = result_rows(result)
        items = [_build_search_item(row, query_vector) for row in rows[:limit]]
        return AISemanticSearchResponse(
            query=query,
            provider="gemini",
            fallback=False,
            results=items,
        )
    except Exception as exc:
        logger.warning("Semantic search fallback: %s", type(exc).__name__)
        fallback_rows: list[dict[str, Any]] = []
        for sql, params in (
            (
                """
                SELECT
                    se.story_id,
                    s.title,
                    se.plot_summary,
                    0.0 AS distance
                FROM story_embeddings AS se
                LEFT JOIN stories AS s ON s.id = se.story_id
                WHERE EXISTS (
                    SELECT 1
                    FROM chapters AS c
                    WHERE c.story_id = s.id
                      AND c.moderation_status = 'approved'
                )
                ORDER BY se.story_id ASC
                LIMIT :limit
                """,
                {"limit": limit},
            ),
            (
                """
                SELECT
                    s.id AS story_id,
                    s.title,
                    s.description AS plot_summary,
                    0.5 AS distance
                FROM stories AS s
                WHERE (
                    lower(s.title) LIKE lower(:pattern)
                    OR lower(s.description) LIKE lower(:pattern)
                    OR lower(s.category) LIKE lower(:pattern)
                )
                AND EXISTS (
                    SELECT 1
                    FROM chapters AS c
                    WHERE c.story_id = s.id
                      AND c.moderation_status = 'approved'
                )
                ORDER BY COALESCE(s.rating_avg, 0) DESC,
                         COALESCE(s.view_count, 0) DESC
                LIMIT :limit
                """,
                {"pattern": f"%{query}%", "limit": limit},
            ),
            (
                """
                SELECT
                    s.id AS story_id,
                    s.title,
                    s.description AS plot_summary,
                    0.75 AS distance
                FROM stories AS s
                WHERE EXISTS (
                    SELECT 1
                    FROM chapters AS c
                    WHERE c.story_id = s.id
                      AND c.moderation_status = 'approved'
                )
                ORDER BY COALESCE(s.rating_avg, 0) DESC,
                         COALESCE(s.view_count, 0) DESC
                LIMIT :limit
                """,
                {"limit": limit},
            ),
        ):
            try:
                result = db.execute(text(sql), params)
                fallback_rows = result_rows(result)
            except Exception:
                fallback_rows = []
            if fallback_rows:
                break

        return AISemanticSearchResponse(
            query=query,
            provider="fallback",
            fallback=True,
            results=[_build_search_item(row, None) for row in fallback_rows[:limit]],
            message=str(exc),
        )


def _average_vectors(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    dimension = min(len(vector) for vector in vectors)
    if dimension == 0:
        return []

    averaged = []
    for index in range(dimension):
        averaged.append(sum(vector[index] for vector in vectors) / len(vectors))
    return averaged


def _with_similarity_and_source(
    rows: list[dict[str, Any]], source: str
) -> list[dict[str, Any]]:
    enriched_rows: list[dict[str, Any]] = []
    for row in rows:
        enriched = dict(row)
        distance = float(enriched.get("distance", 0.0) or 0.0)
        enriched.setdefault("similarity", _clamp_similarity(distance))
        enriched.setdefault("source", source)
        enriched_rows.append(enriched)
    return enriched_rows


def _dedupe_unseen(
    rows: list[dict[str, Any]], seen_story_ids: set[str]
) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    used: set[str] = set()
    for row in rows:
        story_id = str(row.get("story_id") or "")
        if not story_id or story_id in seen_story_ids or story_id in used:
            continue
        filtered.append(row)
        used.add(story_id)
    return filtered


async def _load_preference_rows(db: Any, user_id: str) -> list[dict[str, Any]]:
    result = db.execute(
        text("""
            SELECT DISTINCT
                s.id AS story_id,
                s.title,
                s.category,
                se.plot_summary,
                se.embedding
            FROM reading_histories AS rh
            JOIN chapters AS c ON c.id = rh.chapter_id
            JOIN stories AS s ON s.id = c.story_id
            JOIN story_embeddings AS se ON se.story_id = s.id
            WHERE rh.user_id = :user_id

            UNION

            SELECT DISTINCT
                s.id AS story_id,
                s.title,
                s.category,
                se.plot_summary,
                se.embedding
            FROM libraries AS l
            JOIN stories AS s ON s.id = l.story_id
            JOIN story_embeddings AS se ON se.story_id = s.id
            WHERE l.user_id = :user_id
            """),
        {"user_id": user_id},
    )
    return result_rows(result)


async def _load_vector_candidates(
    db: Any,
    preference_vector: list[float],
    candidate_limit: int,
) -> list[dict[str, Any]]:
    query_vector_literal = _format_vector_literal(preference_vector)
    result = db.execute(
        text("""
            SELECT
                se.story_id,
                s.title,
                s.category,
                s.rating_avg,
                s.view_count,
                se.plot_summary,
                (se.embedding <=> CAST(:query_vector AS vector)) AS distance
            FROM story_embeddings AS se
            LEFT JOIN stories AS s ON s.id = se.story_id
            WHERE EXISTS (
                SELECT 1
                FROM chapters AS visible_chapter
                WHERE visible_chapter.story_id = s.id
                  AND visible_chapter.moderation_status = 'approved'
            )
            ORDER BY distance ASC
            LIMIT :limit
            """),
        {"query_vector": query_vector_literal, "limit": candidate_limit},
    )
    return _with_similarity_and_source(result_rows(result), "semantic")


async def _load_popular_candidates(db: Any, candidate_limit: int) -> list[dict[str, Any]]:
    result = db.execute(
        text("""
            SELECT
                se.story_id,
                s.title,
                s.category,
                s.rating_avg,
                s.view_count,
                se.plot_summary,
                0.0 AS distance
            FROM story_embeddings AS se
            LEFT JOIN stories AS s ON s.id = se.story_id
            WHERE EXISTS (
                SELECT 1
                FROM chapters AS visible_chapter
                WHERE visible_chapter.story_id = s.id
                  AND visible_chapter.moderation_status = 'approved'
            )
            ORDER BY COALESCE(s.rating_avg, 0) DESC,
                     COALESCE(s.view_count, 0) DESC
            LIMIT :limit
            """),
        {"limit": candidate_limit},
    )
    return _with_similarity_and_source(result_rows(result), "popular")


async def recommend_stories_for_user(
    db: Any, user_id: str, limit: int = 5
) -> AIRecommendationResponse:
    candidate_limit = max(
        settings.AI_RECOMMENDATION_CANDIDATE_LIMIT,
        limit * 4,
        limit,
    )

    try:
        preference_rows = await _load_preference_rows(db, user_id)
        preference_vectors = [
            [float(value) for value in row.get("embedding", [])]
            for row in preference_rows
            if isinstance(row.get("embedding"), list) and row.get("embedding")
        ]
        preference_vector = _average_vectors(preference_vectors)
        seen_story_ids = {
            str(row.get("story_id")) for row in preference_rows if row.get("story_id")
        }

        if preference_vector:
            candidate_rows = await _load_vector_candidates(
                db, preference_vector, candidate_limit
            )
            filtered_rows = _dedupe_unseen(candidate_rows, seen_story_ids)
            if not filtered_rows:
                filtered_rows = _dedupe_unseen(
                    await _load_popular_candidates(db, candidate_limit),
                    seen_story_ids,
                )
            ranked_rows, used_llm, llm_message = await RecommendationAgent().rerank(
                db=db,
                user_id=user_id,
                candidates=filtered_rows,
                limit=limit,
            )
            return AIRecommendationResponse(
                user_id=user_id,
                provider="gemini",
                fallback=False,
                recommendations=[
                    build_recommendation_item(row) for row in ranked_rows[:limit]
                ],
                message=llm_message if not used_llm else None,
            )

        popular_rows = _dedupe_unseen(
            await _load_popular_candidates(db, candidate_limit), seen_story_ids
        )
        ranked_rows, used_llm, llm_message = await RecommendationAgent().rerank(
            db=db,
            user_id=user_id,
            candidates=popular_rows,
            limit=limit,
        )
        return AIRecommendationResponse(
            user_id=user_id,
            provider="gemini" if used_llm else "fallback",
            fallback=not used_llm,
            recommendations=[build_recommendation_item(row) for row in ranked_rows],
            message=llm_message
            or "No preference history was found, so visible popular stories were used.",
        )
    except Exception as exc:
        logger.warning("Recommendation generation fallback: %s", type(exc).__name__)
        return AIRecommendationResponse(
            user_id=user_id,
            provider="fallback",
            fallback=True,
            recommendations=[],
            message=str(exc),
        )


async def sync_story_embedding(
    db: Any, story_id: str, description: str
) -> dict[str, Any]:
    embedding = await _generate_text_embedding(description)
    vector_literal = _format_vector_literal(embedding)
    db.execute(
        text("""
            INSERT INTO story_embeddings (
                story_id,
                embedding,
                plot_summary,
                embedding_model
            )
            VALUES (
                :story_id,
                CAST(:embedding AS vector),
                :plot_summary,
                :embedding_model
            )
            ON CONFLICT (story_id) DO UPDATE
            SET embedding = EXCLUDED.embedding,
                plot_summary = EXCLUDED.plot_summary,
                embedding_model = EXCLUDED.embedding_model,
                last_embedded_at = NOW(),
                updated_at = NOW()
            """),
        {
            "story_id": story_id,
            "embedding": vector_literal,
            "plot_summary": description,
            "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
        },
    )
    if hasattr(db, "commit"):
        db.commit()
    return {"story_id": story_id, "embedding": embedding}
