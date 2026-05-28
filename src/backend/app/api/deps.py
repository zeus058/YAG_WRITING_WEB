"""
FastAPI Route Dependency Injection Modules.
Provides database sessions, authenticated current user states, and RBAC filters.
"""
from typing import Generator
from app.core.database import SessionLocal
import uuid

def get_db() -> Generator:
    """Dependency injector for database sessions."""
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_author():
    """Mocked current author dependency for U003 isolated development."""
    class MockUser:
        id = uuid.UUID("11111111-1111-1111-1111-111111111111")
        role = "author"
    return MockUser()
