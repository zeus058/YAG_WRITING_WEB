import base64
import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.services.schedule_service import scan_publish_schedules
from app.worker.main import handle_publish_chapter

router = APIRouter()


def _extract_bearer_token(authorization: str | None) -> str | None:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ", 1)[1]
    return None


def _verify_google_oidc_token(token: str, request_url: str) -> None:
    expected_email = settings.INTERNAL_SERVICE_ACCOUNT_EMAIL
    if not expected_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INTERNAL_OIDC_NOT_CONFIGURED",
        )

    try:
        from google.auth.transport.requests import Request as GoogleAuthRequest
        from google.oauth2 import id_token

        audience = settings.INTERNAL_AUTH_AUDIENCE or request_url
        claims = id_token.verify_oauth2_token(
            token,
            GoogleAuthRequest(),
            audience=audience,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_INTERNAL_OIDC_TOKEN",
        ) from exc

    if claims.get("email") != expected_email or claims.get("email_verified") is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="UNAUTHORIZED_INTERNAL_SERVICE_ACCOUNT",
        )


def _verify_internal_request(
    request: Request,
    authorization: str | None = Header(default=None),
    x_internal_task_token: str | None = Header(default=None),
) -> None:
    expected = settings.INTERNAL_TASK_TOKEN
    bearer_token = _extract_bearer_token(authorization)

    token = x_internal_task_token
    if not token:
        token = bearer_token

    if expected and token == expected:
        return

    if bearer_token:
        _verify_google_oidc_token(bearer_token, str(request.url))
        return

    if expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_INTERNAL_TOKEN",
        )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="INTERNAL_AUTH_NOT_CONFIGURED",
    )


def _decode_pubsub_payload(payload: dict[str, Any]) -> dict[str, Any]:
    message = payload.get("message")
    if not isinstance(message, dict):
        return payload

    data = message.get("data")
    if not data:
        return {}

    decoded = base64.b64decode(str(data)).decode("utf-8")
    result = json.loads(decoded)
    if not isinstance(result, dict):
        raise ValueError("Pub/Sub payload must decode to a JSON object")
    return result


@router.post("/internal/pubsub/moderation", summary="Internal Pub/Sub moderation push")
def receive_pubsub_moderation_task(
    payload: dict[str, Any],
    _: None = Depends(_verify_internal_request),
):
    try:
        task_payload = _decode_pubsub_payload(payload)
        if task_payload.get("task_type") != "publish_chapter":
            raise ValueError("Unsupported task_type")
        handle_publish_chapter(task_payload)
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MODERATION_TASK_FAILED: {exc}",
        ) from exc


@router.post("/internal/schedule/scan", summary="Internal schedule scan trigger")
def run_internal_schedule_scan(
    _: None = Depends(_verify_internal_request),
    db: Session = Depends(deps.get_db),
):
    return scan_publish_schedules(db)
