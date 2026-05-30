"""
Main FastAPI Application Entrypoint.
Initializes the application instance, adds global middleware, and mounts API router.
"""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.services.notification_service import stream_user_notifications
from app.services.schedule_service import shutdown_schedule_scheduler, start_schedule_scheduler

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API services for YAG Smart Novel Platform.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
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

from app.core.database import Base, engine

@app.on_event("startup")
def init_db():
    import app.models
    Base.metadata.create_all(bind=engine)
    start_schedule_scheduler()


@app.on_event("shutdown")
def stop_scheduler():
    shutdown_schedule_scheduler()

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
