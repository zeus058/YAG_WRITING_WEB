"""Production-safe Gemini gateway used by all AI features."""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import PLACEHOLDER_VALUES, settings

logger = logging.getLogger(__name__)

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class _RateLimiter:
    """Process-wide token-bucket rate limiter for Gemini API calls."""

    def __init__(self, rpm: int = 10) -> None:
        self._interval = 60.0 / max(rpm, 1)
        self._async_lock = asyncio.Lock()
        self._sync_lock = threading.Lock()
        self._last_call: float = 0.0

    async def acquire_async(self) -> None:
        async with self._async_lock:
            now = time.monotonic()
            wait = self._interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = time.monotonic()

    def acquire_sync(self) -> None:
        with self._sync_lock:
            now = time.monotonic()
            wait = self._interval - (now - self._last_call)
            if wait > 0:
                time.sleep(wait)
            self._last_call = time.monotonic()


_rate_limiter = _RateLimiter(rpm=settings.GEMINI_RPM_LIMIT)


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
        # 404 = wrong model or endpoint — never retry
        if status_code in (401, 403, 404):
            return False
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
                await _rate_limiter.acquire_async()
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
                is_429 = isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429
                delay = 5.0 * (2 ** attempt) if is_429 else min(0.5 * (attempt + 1), 2.0)
                logger.info("Gemini retry %d/%d in %.1fs (%s)", attempt + 1, self.max_retries, delay, type(exc).__name__)
                await asyncio.sleep(delay)

        logger.warning("Gemini async request failed: %s", type(last_error).__name__)
        raise GeminiGatewayError("Gemini request failed.") from last_error

    def _post_sync(self, url: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                _rate_limiter.acquire_sync()
                with httpx.Client(timeout=settings.GEMINI_TIMEOUT_SECONDS) as client:
                    response = client.post(url, json=payload)
                    response.raise_for_status()
                    return response.json()
            except Exception as exc:  # pragma: no cover - branch tested through callers
                last_error = exc
                if attempt >= self.max_retries or not _should_retry(exc):
                    break
                is_429 = isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429
                delay = 5.0 * (2 ** attempt) if is_429 else min(0.5 * (attempt + 1), 2.0)
                logger.info("Gemini retry %d/%d in %.1fs (%s)", attempt + 1, self.max_retries, delay, type(exc).__name__)
                time.sleep(delay)

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
        model_name = settings.GEMINI_EMBEDDING_MODEL
        if not model_name.startswith("models/"):
            model_name = f"models/{model_name}"
        payload = {
            "model": model_name,
            "content": {"parts": [{"text": text}]},
        }
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

    async def generate_stream(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_output_tokens: int | None = None,
        model: str | None = None,
        response_schema: dict[str, Any] | None = None,
    ):
        payload = self._generation_payload(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_schema=response_schema,
        )
        url = self._url(model or settings.GEMINI_MODEL, "streamGenerateContent")

        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                await _rate_limiter.acquire_async()
                async with httpx.AsyncClient(timeout=settings.GEMINI_TIMEOUT_SECONDS) as client:
                    async with client.stream("POST", url, json=payload) as response:
                        response.raise_for_status()

                        buffer = ""
                        brace_count = 0
                        in_string = False
                        escape = False

                        async for chunk in response.aiter_text():
                            for char in chunk:
                                buffer += char
                                if escape:
                                    escape = False
                                    continue
                                if char == "\\":
                                    escape = True
                                    continue
                                if char == '"':
                                    in_string = not in_string
                                    continue
                                if not in_string:
                                    if char == "{":
                                        brace_count += 1
                                    elif char == "}":
                                        brace_count -= 1
                                        if brace_count == 0:
                                            try:
                                                obj_str = buffer.strip().lstrip(",").lstrip("[").strip()
                                                if obj_str.startswith("{") and obj_str.endswith("}"):
                                                    obj = json.loads(obj_str)
                                                    text_val = ""
                                                    candidates = obj.get("candidates") or []
                                                    if candidates:
                                                        parts = candidates[0].get("content", {}).get("parts", [])
                                                        for part in parts:
                                                            if "text" in part:
                                                                text_val += part["text"]
                                                    if text_val:
                                                        yield text_val
                                            except Exception as e:
                                                logger.warning("Error parsing stream chunk: %s", e)
                                            buffer = ""
                        return  # Stream completed successfully
            except Exception as exc:
                last_error = exc
                if attempt >= self.max_retries or not _should_retry(exc):
                    break
                is_429 = isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429
                delay = 5.0 * (2 ** attempt) if is_429 else min(0.5 * (attempt + 1), 2.0)
                logger.info("Gemini stream retry %d/%d in %.1fs (%s)", attempt + 1, self.max_retries, delay, type(exc).__name__)
                await asyncio.sleep(delay)

        logger.warning("Gemini stream request failed: %s", type(last_error).__name__)
        raise GeminiGatewayError("Gemini stream request failed.") from last_error

    async def verify_connection(self) -> dict[str, Any]:
        """Call models.list to verify API key works. Called once at startup."""
        if not gemini_api_key_configured():
            return {"status": "skipped", "reason": "API key not configured"}
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                models = resp.json().get("models", [])
                model_names = [m.get("name", "") for m in models[:50]]
                configured = [
                    settings.GEMINI_MODEL,
                    settings.GEMINI_STRONG_MODEL,
                    settings.GEMINI_FAST_MODEL,
                    settings.GEMINI_MODERATION_MODEL,
                    settings.GEMINI_EMBEDDING_MODEL,
                ]
                available = {n.split("/")[-1] for n in model_names}
                missing = [m for m in set(configured) if m not in available]
                return {
                    "status": "ok" if not missing else "warning",
                    "available_count": len(models),
                    "missing_models": missing,
                }
        except Exception as exc:
            return {"status": "error", "reason": f"{type(exc).__name__}: {exc}"}
