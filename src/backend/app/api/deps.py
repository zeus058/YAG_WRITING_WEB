"""
FastAPI Route Dependency Injection Modules.
Provides database sessions, authenticated current user states, and RBAC filters.
"""
from typing import Generator
from app.core.database import SessionLocal

def get_db() -> Generator:
    """Dependency injector for database sessions."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()
