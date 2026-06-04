import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from fastapi import status

from app.main import app
from app.api import deps
from app.models.membership_plan import MembershipPlan

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Generates a mock database session."""
    return MagicMock()


@pytest.fixture(autouse=True)
def override_db(mock_db):
    """Automatically overrides deps.get_db with mock database session."""
    def _override():
        yield mock_db
    app.dependency_overrides[deps.get_db] = _override
    yield
    app.dependency_overrides.pop(deps.get_db, None)


def test_get_membership_plans_success(mock_db):
    """Verifies that listing membership plans retrieves plans sorted by price ascending."""
    mock_plans = [
        MembershipPlan(id="MONTHLY", name="Gói tháng", duration_days=30, price=99000.0, description="Hạn 1 tháng"),
        MembershipPlan(id="YEARLY", name="Gói năm", duration_days=365, price=999000.0, description="Hạn 1 năm")
    ]

    mock_db.query.return_value.order_by.return_value.all.return_value = mock_plans

    response = client.get("/api/v1/membership/plans")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert data[0]["id"] == "MONTHLY"
    assert data[0]["price"] == 99000.0
    assert data[1]["id"] == "YEARLY"
    assert data[1]["price"] == 999000.0

    # Also test the payment alias path
    response_alias = client.get("/api/v1/payment/plans")
    assert response_alias.status_code == status.HTTP_200_OK
    assert len(response_alias.json()) == 2
