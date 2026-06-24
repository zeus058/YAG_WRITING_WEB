"""Production-safe Gemini gateway used by all AI features."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import PLACEHOLDER_VALUES, settings

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiGatewayError(RuntimeError):
    """Base error for Gemini gateway failures."""


class GeminiConfigurationError(GeminiGatewayError):
    """Raised when Gemini cannot be used because configuration is missing."""


class GeminiResponseError(GeminiGatewayError):
    """Raised when Gemini returns malformed or unusable data."""


def gemini_api_key_configured() -> bool:
    api_key = (settings.GEMINI_API_KEY or "").strip()
    return bool(api_key and api_key.lower() not in PLACEHOLDER_VALUES)


def extract_json_object(raw_text: str) -> dict[str, Any]:
    candidate_text = (raw_text or "").strip()
    if candidate_text.startswith("```"):
        candidate_text = candidate_text.strip("`").strip()
        if candidate_text.lower().startswith("json"):
            candidate_text = candidate_text[4:].strip()

    start = candidate_text.find("{")
    end = candidate_text.rfind("}")
    if start >= 0 and end > start:
        candidate_text = candidate_text[start: end + 1]

    data = json.loads(candidate_text)
    if not isinstance(data, dict):
        raise GeminiResponseError("Gemini response must be a JSON object.")
    return data


def _extract_text(data: dict[str, Any]) -> str:
    try:
        candidate = (data.get("candidates") or [])[0]
        content = candidate.get("content", {})
        parts = content.get("parts", [])
    except (AttributeError, IndexError, TypeError) as exc:
        raise GeminiResponseError("Gemini response is missing content parts.") from exc

    raw_text = "".join(
        str(part.get("text", "")) for part in parts if isinstance(part, dict)
    ).strip()
    if not raw_text:
        raise GeminiResponseError("Gemini response was empty.")
    return raw_text


def _should_retry(exc: Exception) -> bool:
    if isinstance(exc, httpx.HTTPStatusError):
        status_code = exc.response.status_code
        return status_code == 429 or status_code >= 500
    return isinstance(
        exc,
        (
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.ReadError,
            httpx.RemoteProtocolError,
        ),
    )


@dataclass(slots=True)
class GeminiGateway:
    """Small REST adapter that centralizes Gemini retries and JSON parsing."""

    max_retries: int = 2

    def _url(self, model: str, action: str) -> str:
        if not gemini_api_key_configured():
            raise GeminiConfigurationError("Gemini API key is missing.")
        return f"{GEMINI_BASE_URL}/{model}:{action}?key={settings.GEMINI_API_KEY}"

    def _generation_payload(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float,
        max_output_tokens: int | None,
        response_schema: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        generation_config = {
            "temperature": temperature,
            "topP": 0.9,
            "maxOutputTokens": max_output_tokens or settings.GEMINI_MAX_OUTPUT_TOKENS,
            "responseMimeType": "application/json",
        }
        if response_schema:
            generation_config["responseSchema"] = response_schema
            
        return {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": generation_config,
        }

    async def _post_async(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=settings.GEMINI_TIMEOUT_SECONDS
                ) as client:
                    response = await client.post(url, json=payload)
                    response.raise_for_status()
                    return response.json()
            except Exception as exc:  # pragma: no cover - branch tested through callers
                last_error = exc
                if attempt >= self.max_retries or not _should_retry(exc):
                    break
                await asyncio.sleep(min(0.25 * (attempt + 1), 1.0))

        logger.warning("Gemini async request failed: %s", type(last_error).__name__)
        raise GeminiGatewayError("Gemini request failed.") from last_error

    def _post_sync(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                with httpx.Client(timeout=settings.GEMINI_TIMEOUT_SECONDS) as client:
                    response = client.post(url, json=payload)
                    response.raise_for_status()
                    return response.json()
            except Exception as exc:  # pragma: no cover - branch tested through callers
                last_error = exc
                if attempt >= self.max_retries or not _should_retry(exc):
                    break
                time.sleep(min(0.25 * (attempt + 1), 1.0))

        logger.warning("Gemini sync request failed: %s", type(last_error).__name__)
        raise GeminiGatewayError("Gemini request failed.") from last_error

    async def generate_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_output_tokens: int | None = None,
        model: str | None = None,
        response_schema: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], str]:
        payload = self._generation_payload(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_schema=response_schema,
        )
        data = await self._post_async(
            self._url(model or settings.GEMINI_MODEL, "generateContent"), payload
        )
        raw_text = _extract_text(data)
        return extract_json_object(raw_text), raw_text[:2000]

    def generate_json_sync(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_output_tokens: int | None = None,
        model: str | None = None,
        response_schema: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], str]:
        payload = self._generation_payload(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_schema=response_schema,
        )
        data = self._post_sync(
            self._url(model or settings.GEMINI_MODEL, "generateContent"), payload
        )
        raw_text = _extract_text(data)
        return extract_json_object(raw_text), raw_text[:2000]

    async def embed_text(self, text: str) -> list[float]:
        payload = {"content": {"parts": [{"text": text}]}}
        data = await self._post_async(
            self._url(settings.GEMINI_EMBEDDING_MODEL, "embedContent"), payload
        )
        embedding = data.get("embedding") or {}
        values = (
            embedding.get("values") or embedding.get("vector") or embedding.get("embedding")
        )
        if not isinstance(values, list) or not values:
            raise GeminiResponseError("Gemini embedding response is invalid.")
        return [float(value) for value in values]
