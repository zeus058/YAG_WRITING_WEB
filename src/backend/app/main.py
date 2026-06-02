import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router
from app.api.v1.endpoints.chapters import flush_story_view_counts, get_redis_client
from app.core.database import engine, Base, SessionLocal
import app.models  # Ensure models are loaded before creating tables
from app.services.notification_service import stream_user_notifications
from app.services.schedule_service import shutdown_schedule_scheduler, start_schedule_scheduler

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
    # Automatically create all tables on startup
    from app.core.database import Base, engine
    from sqlalchemy import text
    import app.models  # Register all models on Base metadata
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    Base.metadata.create_all(bind=engine)
    
    # Start schedule scheduler
    start_schedule_scheduler()
    
    # Start background view count flush task
    flush_task = asyncio.create_task(periodic_view_count_flush())
    yield
    # Cancel task on shutdown
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
    lifespan=lifespan
)

# Set CORS middleware origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js frontend local origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all API endpoints
app.include_router(api_router, prefix=settings.API_V1_STR)

# Serve local media uploads in development. Production can replace this with Cloudinary URLs.
uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(uploads_dir)), name="media")

@app.get("/", tags=["Main"])
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs": "/docs"
    }


@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    await stream_user_notifications(websocket, user_id)


@app.websocket(f"{settings.API_V1_STR}/ws/notifications/{{user_id}}")
async def websocket_notifications_v1(websocket: WebSocket, user_id: str):
    await stream_user_notifications(websocket, user_id)

