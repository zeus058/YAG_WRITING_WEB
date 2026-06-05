"""
Tests for Membership (U011) & PayOS Payment (U012) endpoints and services.

Covers:
- GET  /api/v1/payment/plans
- GET  /api/v1/payment/membership/status
- POST /api/v1/payment/payos/checkout
- POST /api/v1/payment/payos/webhook
- POST /api/v1/payment/payos/verify
- GET  /api/v1/payment/history
- GET  /api/v1/chapters/{id} (premium RBAC)
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.main import app

client = TestClient(app)


def _db_available() -> bool:
    """Check if PostgreSQL is reachable for integration tests."""
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


_skip_no_db = pytest.mark.skipif(
    not _db_available(),
    reason="PostgreSQL is not available (Docker not running?)"
)


def _make_jwt(user_id: uuid.UUID) -> str:
    """Create a valid JWT for testing."""
    return create_access_token(subject=str(user_id))


def _auth_header(user_id: uuid.UUID) -> dict:
    """Return Authorization header dict."""
    return {"Authorization": f"Bearer {_make_jwt(user_id)}"}


class TestMembershipPlansEndpoint:
    """Test GET /api/v1/payment/plans."""

    @_skip_no_db
    def test_get_plans_returns_200(self):
        """Plans endpoint should return 200 even if no plans in DB."""
        response = client.get(f"{settings.API_V1_STR}/payment/plans")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @_skip_no_db
    def test_get_plans_returns_list(self):
        """Response should be a JSON array."""
        response = client.get(f"{settings.API_V1_STR}/payment/plans")
        data = response.json()
        assert isinstance(data, list)


class TestMembershipStatusEndpoint:
    """Test GET /api/v1/payment/membership/status."""

    def test_status_requires_auth(self):
        """Endpoint should return 401 without JWT."""
        response = client.get(f"{settings.API_V1_STR}/payment/membership/status")
        assert response.status_code == 401


class TestCheckoutEndpoint:
    """Test POST /api/v1/payment/payos/checkout."""

    def test_checkout_requires_auth(self):
        """Endpoint should return 401 without JWT."""
        response = client.post(
            f"{settings.API_V1_STR}/payment/payos/checkout",
            json={"plan_id": "MONTHLY"},
        )
        assert response.status_code == 401


class TestPaymentHistoryEndpoint:
    """Test GET /api/v1/payment/history."""

    def test_history_requires_auth(self):
        """Endpoint should return 401 without JWT."""
        response = client.get(f"{settings.API_V1_STR}/payment/history")
        assert response.status_code == 401


class TestPaymentAPIWithMocks:
    """Test payment endpoints using mocked dependencies to bypass database state."""

    @pytest.fixture(autouse=True)
    def setup_mocks(self):
        from unittest.mock import MagicMock
        from app.api import deps
        from app.models import User

        self.mock_db = MagicMock()
        self.mock_user = User(
            id=uuid.uuid4(),
            username="test_reader",
            email="test_reader@yag.vn",
            role="reader",
            premium_until=None
        )

        def _override_db():
            yield self.mock_db

        def _override_user():
            return self.mock_user

        app.dependency_overrides[deps.get_db] = _override_db
        app.dependency_overrides[deps.get_current_user] = _override_user
        yield
        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_user, None)

    def test_checkout_plan_not_found(self):
        # Mock plan lookup returns None
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.post(
            f"{settings.API_V1_STR}/payment/payos/checkout",
            json={"plan_id": "INVALID", "return_url": "http://localhost:3000/payment/result"},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 404
        assert "không tồn tại" in response.json()["detail"]

    def test_get_membership_status_premium(self):
        from datetime import datetime, timezone, timedelta
        from app.models import Transaction, MembershipPlan
        
        self.mock_user.premium_until = datetime.now(timezone.utc) + timedelta(days=5)

        # Mock latest transaction query
        mock_plan = MembershipPlan(id="MONTHLY", name="Gói Tháng Premium")
        mock_txn = Transaction(plan_id="MONTHLY", status="success", membership_plan=mock_plan)
        
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.first.return_value = mock_txn

        response = client.get(
            f"{settings.API_V1_STR}/payment/membership/status",
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is True
        assert data["plan_name"] == "Gói Tháng Premium"

    def test_get_payment_history(self):
        from app.models import Transaction, MembershipPlan

        mock_plan = MembershipPlan(id="MONTHLY", name="Gói Tháng Premium")
        mock_txns = [
            Transaction(id=uuid.uuid4(), plan_id="MONTHLY", amount=50000.00, status="success", membership_plan=mock_plan, vnp_transaction_no="123")
        ]
        self.mock_db.query.return_value.filter.return_value.options.return_value.order_by.return_value.all.return_value = mock_txns

        response = client.get(
            f"{settings.API_V1_STR}/payment/history",
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["plan_name"] == "Gói Tháng Premium"
        assert data[0]["amount"] == 50000.00

    def test_get_transaction_status_404(self):
        self.mock_db.query.return_value.filter.return_value.options.return_value.first.return_value = None

        response = client.get(
            f"{settings.API_V1_STR}/payment/transactions/nonexistent",
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 404

    def test_checkout_payos_success(self):
        from app.models.membership_plan import MembershipPlan
        from app.core.config import settings
        from unittest.mock import AsyncMock, patch

        settings.PAYMENT_PROVIDER = "payos"

        mock_plan = MembershipPlan(id="MONTHLY", name="Gói tháng", duration_days=30, price=50000.00)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_plan

        with patch("app.services.payos_service.create_payos_payment_link", new_callable=AsyncMock) as mock_payos:
            mock_payos.return_value = ("http://mock-payos-url.com", "mock_checkout_ref")
            response = client.post(
                f"{settings.API_V1_STR}/payment/payos/checkout",
                json={"plan_id": "MONTHLY", "return_url": "http://localhost:3000/payment/result"},
                headers={"Authorization": "Bearer fake-token"}
            )
            assert response.status_code == 201
            data = response.json()
            assert data["payment_url"] == "http://mock-payos-url.com"

    def test_payos_webhook_success(self):
        from app.models import Transaction, MembershipPlan, User
        from app.core.config import settings
        from unittest.mock import patch, MagicMock

        mock_txn = Transaction(user_id=self.mock_user.id, plan_id="MONTHLY", status="pending", amount=50000.00)
        mock_plan = MembershipPlan(id="MONTHLY", duration_days=30)
        
        def mock_query(model):
            mock_q = MagicMock()
            if model == Transaction:
                mock_q.filter.return_value.first.return_value = mock_txn
            elif model == MembershipPlan:
                mock_q.filter.return_value.first.return_value = mock_plan
            elif model == User:
                mock_q.filter.return_value.first.return_value = self.mock_user
            return mock_q

        self.mock_db.query = mock_query

        with patch("app.services.payos_service.verify_payos_webhook_signature", return_value=True):
            response = client.post(
                f"{settings.API_V1_STR}/payment/payos/webhook",
                json={"code": "00", "desc": "success", "data": {"orderCode": 123456, "reference": "ref123"}},
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Confirm Success"
            assert mock_txn.status == "success"

    def test_verify_payos_checkout_success(self):
        from app.models import Transaction, MembershipPlan, User
        from unittest.mock import MagicMock

        mock_txn = Transaction(user_id=self.mock_user.id, plan_id="MONTHLY", status="success", amount=50000.00)
        mock_plan = MembershipPlan(id="MONTHLY", name="Gói Tháng Premium", duration_days=30)
        
        def mock_query(model):
            mock_q = MagicMock()
            if model == Transaction:
                mock_q.filter.return_value.first.return_value = mock_txn
            elif model == MembershipPlan:
                mock_q.filter.return_value.first.return_value = mock_plan
            elif model == User:
                mock_q.filter.return_value.first.return_value = self.mock_user
            return mock_q

        self.mock_db.query = mock_query

        response = client.post(
            f"{settings.API_V1_STR}/payment/payos/verify",
            json={"orderCode": "123456", "status": "success"},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["plan_name"] == "Gói Tháng Premium"
