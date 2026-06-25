import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID
from uuid import uuid4

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pika
import redis
from sqlalchemy import text
from app.core.config import settings
from app.api.v1.router import api_router
from app.api.v1.endpoints.chapters import (
    flush_story_view_counts,
    get_redis_client,
    websocket_editor,
)
from app.core.database import engine, SessionLocal
import app.models as _models  # noqa: F401  # Ensure models are loaded before creating tables
from app.services.notification_service import stream_user_notifications
from app.services.publish_service import get_rabbitmq_connection
from app.services.schedule_service import (
    shutdown_schedule_scheduler,
    start_schedule_scheduler,
)


async def periodic_view_count_flush() -> None:
    while True:
        await asyncio.sleep(600)
        db = SessionLocal()
        try:
            flush_story_view_counts(db, get_redis_client())
        except Exception:
            pass
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema lifecycle is owned by versioned SQL migrations. Startup only starts
    # configured background tasks and checks are exposed through /health/ready.
    start_schedule_scheduler()

    if settings.AI_AGENT_ENABLED:
        from app.services.ai_service import sync_all_missing_embeddings_async
        asyncio.create_task(sync_all_missing_embeddings_async())

    flush_task = None
    if settings.VIEW_COUNT_FLUSH_ENABLED:
        flush_task = asyncio.create_task(periodic_view_count_flush())
    yield
    if flush_task:
        flush_task.cancel()
        try:
            await flush_task
        except asyncio.CancelledError:
            pass

    # Shutdown scheduler
    shutdown_schedule_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API services for YAG Smart Novel Platform.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# Set CORS middleware origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid4().hex
    try:
        response = await call_next(request)
    except Exception:
        if settings.ENVIRONMENT == "development":
            raise
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )

    response.headers["X-Request-ID"] = request_id
    if not response.headers.get("X-Content-Type-Options"):
        response.headers["X-Content-Type-Options"] = "nosniff"
    if not response.headers.get("X-Frame-Options"):
        response.headers["X-Frame-Options"] = "DENY"
    if not response.headers.get("Referrer-Policy"):
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.ENVIRONMENT == "production" and not response.headers.get(
        "Strict-Transport-Security"
    ):
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
    return response


# Serve local uploads only outside production. Internet deployment uses Cloudinary URLs.
if settings.ENVIRONMENT != "production":
    uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=str(uploads_dir)), name="media")


@app.get("/", tags=["Main"])
def read_root():
    return {"status": "online", "project": settings.PROJECT_NAME, "docs": "/docs"}


@app.get("/health", tags=["Main"])
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
    }


@app.get("/health/live", tags=["Main"])
def liveness_check():
    return {"status": "ok"}


@app.get("/health/ready", tags=["Main"])
def readiness_check():
    checks: dict[str, str] = {}

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {exc.__class__.__name__}"

    try:
        get_redis_client().ping()
        checks["redis"] = "ok"
    except redis.RedisError as exc:
        checks["redis"] = f"error: {exc.__class__.__name__}"
    except Exception as exc:
        checks["redis"] = f"error: {exc.__class__.__name__}"

    if settings.QUEUE_PROVIDER == "rabbitmq":
        rabbit_connection = None
        try:
            rabbit_connection = get_rabbitmq_connection()
            checks["queue"] = "ok (rabbitmq)"
        except pika.exceptions.AMQPError as exc:
            checks["queue"] = f"error: {exc.__class__.__name__}"
        except Exception as exc:
            checks["queue"] = f"error: {exc.__class__.__name__}"
        finally:
            if rabbit_connection and not rabbit_connection.is_closed:
                rabbit_connection.close()
    elif settings.QUEUE_PROVIDER == "pubsub":
        try:
            from google.cloud import pubsub_v1  # noqa: F401

            if not (
                (settings.PUBSUB_PROJECT_ID or settings.GCP_PROJECT_ID)
                and settings.PUBSUB_MODERATION_TOPIC
            ):
                checks["queue"] = "error: PubSubNotConfigured"
            else:
                checks["queue"] = "ok (pubsub)"
        except Exception as exc:
            checks["queue"] = f"error: {exc.__class__.__name__}"
    else:
        checks["queue"] = f"error: unsupported provider {settings.QUEUE_PROVIDER}"

    status_value = (
        "ok" if all(value.startswith("ok") for value in checks.values()) else "degraded"
    )
    return {"status": status_value, "checks": checks}


@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    await stream_user_notifications(websocket, user_id)


@app.websocket(f"{settings.API_V1_STR}/ws/notifications/{{user_id}}")
async def websocket_notifications_v1(websocket: WebSocket, user_id: str):
    await stream_user_notifications(websocket, user_id)


@app.websocket("/ws/stories/{story_id}/chapters/{chapter_id}")
async def websocket_story_chapter_draft(
    websocket: WebSocket, story_id: str, chapter_id: str
):
    _ = story_id
    await websocket_editor(websocket, UUID(chapter_id))
