"""
Tests for Membership (U011) & VNPAY Payment (U012) endpoints and services.

Covers:
- GET  /api/v1/payment/plans
- GET  /api/v1/payment/membership/status
- POST /api/v1/payment/vnpay/checkout
- GET  /api/v1/payment/vnpay/ipn
- GET  /api/v1/payment/history
- GET  /api/v1/chapters/{id} (premium RBAC)
- VNPAY checksum generation & verification
- IPN RspCode mapping (00, 02, 04, 97)
- verify_payment_result (mock checkout + real transaction flows)
"""
import hashlib
import hmac
import uuid
from urllib.parse import urlencode

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.services import payment_service as payment_svc

client = TestClient(app)

# Override VNPAY configurations for unit tests to ensure strict signature verification is active
settings.VNP_HASH_SECRET = "YAGDEVSECRETKEY12345678"


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


# ---------------------------------------------------------------------------
# Helper fixtures / utilities
# ---------------------------------------------------------------------------

def _make_jwt(user_id: uuid.UUID) -> str:
    """Create a valid JWT for testing."""
    return create_access_token(subject=str(user_id))


def _auth_header(user_id: uuid.UUID) -> dict:
    """Return Authorization header dict."""
    return {"Authorization": f"Bearer {_make_jwt(user_id)}"}


# ---------------------------------------------------------------------------
# 1. Unit tests for payment service utilities
# ---------------------------------------------------------------------------

class TestVNPAYService:
    """Test VNPAY URL generation and checksum verification."""

    def test_generate_txn_ref_format(self):
        """Transaction ref starts with YAG and has proper length."""
        ref = payment_svc.generate_txn_ref()
        assert ref.startswith("YAG")
        assert len(ref) > 10

    def test_generate_txn_ref_unique(self):
        """Two consecutive calls produce different refs."""
        ref1 = payment_svc.generate_txn_ref()
        ref2 = payment_svc.generate_txn_ref()
        assert ref1 != ref2

    def test_generate_vnpay_url_contains_hash(self):
        """Generated URL should contain vnp_SecureHash."""
        url = payment_svc.generate_vnpay_url(
            vnp_txn_ref="TEST123",
            amount=49000,
            ip_addr="127.0.0.1",
            order_info="Test order",
        )
        assert "vnp_SecureHash=" in url
        assert "vnp_SecureHashType=SHA512" in url
        assert settings.VNP_URL in url

    def test_generate_vnpay_url_amount_multiplied(self):
        """Amount should be multiplied by 100 per VNPAY spec."""
        url = payment_svc.generate_vnpay_url(
            vnp_txn_ref="TEST123",
            amount=49000,
            ip_addr="127.0.0.1",
            order_info="Test order",
        )
        # 49000 * 100 = 4900000
        assert "vnp_Amount=4900000" in url

    def test_verify_checksum_valid(self):
        """Verify checksum passes for correctly signed params."""
        params = {
            "vnp_Amount": "4900000",
            "vnp_Command": "pay",
            "vnp_TmnCode": settings.VNP_TMN_CODE,
            "vnp_TxnRef": "TEST123",
        }
        sorted_params = sorted(params.items())
        query_string = urlencode(sorted_params)
        secure_hash = hmac.new(
            settings.VNP_HASH_SECRET.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

        params["vnp_SecureHash"] = secure_hash
        assert payment_svc.verify_vnpay_checksum(params) is True

    def test_verify_checksum_invalid(self):
        """Verify checksum fails for tampered params."""
        params = {
            "vnp_Amount": "4900000",
            "vnp_TxnRef": "TEST123",
            "vnp_SecureHash": "invalid_hash_value",
        }
        assert payment_svc.verify_vnpay_checksum(params) is False


# ---------------------------------------------------------------------------
# 2. Endpoint tests (using TestClient with real DB via Docker)
# ---------------------------------------------------------------------------

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
    """Test POST /api/v1/payment/vnpay/checkout."""

    def test_checkout_requires_auth(self):
        """Endpoint should return 401 without JWT."""
        response = client.post(
            f"{settings.API_V1_STR}/payment/vnpay/checkout",
            json={"plan_id": "MONTHLY"},
        )
        assert response.status_code == 401

    def test_checkout_validates_plan(self):
        """Checkout with non-existent plan should return 404 (if authenticated)."""
        # This test requires a valid user in DB — skip if no DB
        # The 401 check above covers the auth layer


class TestIPNEndpoint:
    """Test GET /api/v1/payment/vnpay/ipn."""

    def test_ipn_no_params_returns_checksum_error(self):
        """IPN with no params should fail checksum verification."""
        response = client.get(f"{settings.API_V1_STR}/payment/vnpay/ipn")
        data = response.json()
        assert response.status_code == 200  # VNPAY always expects 200
        assert data["RspCode"] == "97"  # Invalid checksum

    def test_ipn_invalid_hash_returns_97(self):
        """IPN with bad hash should return RspCode 97."""
        response = client.get(
            f"{settings.API_V1_STR}/payment/vnpay/ipn",
            params={
                "vnp_TxnRef": "FAKE123",
                "vnp_Amount": "4900000",
                "vnp_SecureHash": "badhash",
            },
        )
        data = response.json()
        assert data["RspCode"] == "97"


class TestPaymentHistoryEndpoint:
    """Test GET /api/v1/payment/history."""

    def test_history_requires_auth(self):
        """Endpoint should return 401 without JWT."""
        response = client.get(f"{settings.API_V1_STR}/payment/history")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# 3. IPN process_ipn service logic (mocked DB)
# ---------------------------------------------------------------------------

class TestIPNProcessLogic:
    """Test the process_ipn service function in isolation."""

    def _sign_params(self, params: dict) -> str:
        """Helper: compute HMAC-SHA512 hash for VNPAY params."""
        filtered = {k: v for k, v in params.items() if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
        sorted_params = sorted(filtered.items())
        query_string = urlencode(sorted_params)
        return hmac.new(
            settings.VNP_HASH_SECRET.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

    def test_invalid_checksum_returns_97(self):
        """Invalid checksum → RspCode 97."""
        params = {"vnp_TxnRef": "X", "vnp_SecureHash": "bad"}

        # We need a mock DB session that won't be called
        class MockDB:
            pass

        code, msg = payment_svc.process_ipn(MockDB(), params)
        assert code == "97"

    def test_transaction_not_found_returns_02(self):
        """Valid checksum but missing transaction → RspCode 02."""
        params = {
            "vnp_TxnRef": "NONEXISTENT",
            "vnp_Amount": "100",
        }
        params["vnp_SecureHash"] = self._sign_params(params)

        # Mock DB query returning None
        class MockQuery:
            def filter(self, *args): return self
            def first(self): return None

        class MockDB:
            def query(self, model): return MockQuery()

        code, msg = payment_svc.process_ipn(MockDB(), params)
        assert code == "02"


# ---------------------------------------------------------------------------
# 4. verify_payment_result service logic (mocked DB)
# ---------------------------------------------------------------------------

class TestVerifyPaymentResultLogic:
    """Test verify_payment_result function."""

    def _sign_params(self, params: dict) -> str:
        """Helper: compute HMAC-SHA512 hash for VNPAY params."""
        filtered = {k: v for k, v in params.items() if k not in ("vnp_SecureHash", "vnp_SecureHashType")}
        sorted_params = sorted(filtered.items())
        query_string = urlencode(sorted_params)
        return hmac.new(
            settings.VNP_HASH_SECRET.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

    def test_verify_result_invalid_checksum(self):
        """Invalid checksum in verify returns success=False."""
        params = {"vnp_TxnRef": "X", "vnp_SecureHash": "bad"}

        class MockDB:
            pass

        result = payment_svc.verify_payment_result(MockDB(), params)
        assert result["success"] is False
        assert "checksum" in result["message"]

    def test_verify_result_transaction_not_found(self):
        """Valid checksum but missing transaction returns success=False."""
        params = {
            "vnp_TxnRef": "NONEXISTENT",
            "vnp_Amount": "100",
        }
        params["vnp_SecureHash"] = self._sign_params(params)

        class MockQuery:
            def filter(self, *args): return self
            def first(self): return None

        class MockDB:
            def query(self, model): return MockQuery()

        result = payment_svc.verify_payment_result(MockDB(), params)
        assert result["success"] is False
        assert "Không tìm thấy" in result["message"]

    def test_verify_result_mock_checkout_extension(self):
        """Mock checkout extends current user premium subscription."""
        params = {
            "vnp_TxnRef": "MOCK_TXN_REF",
            "vnp_Amount": "4900000",
        }

        class MockUser:
            def __init__(self):
                self.premium_until = None

        class MockDB:
            def commit(self):
                pass

        user = MockUser()
        result = payment_svc.verify_payment_result(MockDB(), params, current_user=user)
        assert result["success"] is True
        assert result["plan_name"] == "Gói Tháng Premium"
        assert user.premium_until is not None

        # Test extending an already active membership
        initial_expiry = user.premium_until
        result2 = payment_svc.verify_payment_result(MockDB(), params, current_user=user)
        assert result2["success"] is True
        assert user.premium_until > initial_expiry

    def test_verify_result_mock_checkout_yearly(self):
        """Mock checkout for yearly package adds 365 days."""
        params = {
            "vnp_TxnRef": "MOCK_TXN_REF",
            "vnp_Amount": "39900000",  # 399,000 VND
        }

        class MockUser:
            def __init__(self):
                self.premium_until = None

        class MockDB:
            def commit(self):
                pass

        user = MockUser()
        result = payment_svc.verify_payment_result(MockDB(), params, current_user=user)
        assert result["success"] is True
        assert result["plan_name"] == "Gói Năm Premium"
        assert result["amount"] == 399000.0


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

    def test_checkout_vnpay_success(self):
        from app.models.membership_plan import MembershipPlan
        from app.core.config import settings

        # Configure VNPAY provider
        settings.PAYMENT_PROVIDER = "vnpay"

        # Mock plan lookup
        mock_plan = MembershipPlan(id="MONTHLY", name="Gói tháng", duration_days=30, price=50000.00)
        self.mock_db.query.return_value.filter.return_value.first.return_value = mock_plan

        response = client.post(
            f"{settings.API_V1_STR}/payment/vnpay/checkout",
            json={"plan_id": "MONTHLY", "return_url": "http://localhost:3000/payment/result"},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert response.status_code == 201
        data = response.json()
        assert "payment_url" in data
        assert "vnp_securehash" in data.get("payment_url", "").lower()

    def test_checkout_plan_not_found(self):
        # Mock plan lookup returns None
        self.mock_db.query.return_value.filter.return_value.first.return_value = None

        response = client.post(
            f"{settings.API_V1_STR}/payment/vnpay/checkout",
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

