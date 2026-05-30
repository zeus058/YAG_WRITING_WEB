"""
Main FastAPI Application Entrypoint.
Initializes the application instance, adds global middleware, and mounts API router.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router
from app.core.database import engine, Base
from pathlib import Path
import app.models  # Ensure models are loaded before creating tables

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

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
