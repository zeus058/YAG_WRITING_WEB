"""
Main FastAPI Application Entrypoint.
Initializes the application instance, adds global middleware, and mounts API router.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create all tables on startup
    from app.core.database import Base, engine
    from sqlalchemy import text
    import app.models  # Register all models on Base metadata
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
    Base.metadata.create_all(bind=engine)
    yield

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

@app.get("/", tags=["Main"])
def read_root():
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "docs": "/docs"
    }
