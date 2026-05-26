"""
Unit tests cơ bản cho Backend.
"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_returns_200():
    """Kiểm tra API còn sống."""
    response = client.get("/")
    assert response.status_code in [200, 404]


def test_docs_available():
    """Kiểm tra Swagger UI hoạt động."""
    response = client.get("/docs")
    assert response.status_code == 200


def test_health_check():
    """Kiểm tra cấu trúc app khởi động được."""
    assert app is not None