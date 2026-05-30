import uuid
from datetime import date, datetime, timezone

import pytest

from app.models.admin_audit_log import AdminAuditLog
from app.models.ai_moderation_log import AIModerationLog
from app.models.chapter import Chapter
from app.models.membership import Transaction
from app.models.user import User
from app.services.admin_service import AdminService


class FakeQuery:
    def __init__(self, result=None, count_value=0, all_result=None):
        self.result = result
        self.count_value = count_value
        self.all_result = all_result or []

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def first(self):
        return self.result

    def count(self):
        return self.count_value

    def all(self):
        return self.all_result


class FakeDB:
    def __init__(self, user=None, chapter=None, counts=None, transactions=None, users=None, chapters=None):
        self.user = user
        self.chapter = chapter
        self.counts = counts or {}
        self.transactions = transactions or []
        self.users = users or ([user] if user else [])
        self.chapters = chapters or ([chapter] if chapter else [])
        self.added = []
        self.committed = False

    def query(self, model):
        if model is User:
            return FakeQuery(result=self.user, count_value=self.counts.get(User, len(self.users)), all_result=self.users)
        if model is Chapter:
            return FakeQuery(result=self.chapter, count_value=self.counts.get(Chapter, len(self.chapters)), all_result=self.chapters)
        if model is Transaction:
            return FakeQuery(count_value=len(self.transactions), all_result=self.transactions)
        return FakeQuery(count_value=self.counts.get(model, 0))

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        return None


def _admin():
    return User(
        id=uuid.uuid4(),
        username="admin",
        email="admin@yag.vn",
        password_hash="x",
        role="admin",
    )


def _user():
    return User(
        id=uuid.uuid4(),
        username="reader",
        email="reader@yag.vn",
        password_hash="x",
        role="reader",
        is_locked=False,
    )


def _chapter():
    return Chapter(
        id=uuid.uuid4(),
        story_id=uuid.uuid4(),
        chapter_number=1,
        title="Flagged chapter",
        content="content",
        moderation_status="flagged",
    )


def test_require_admin_rejects_non_admin():
    with pytest.raises(Exception):
        AdminService.require_admin(_user())


def test_lock_user_sets_lock_fields_and_audit_log():
    admin = _admin()
    target = _user()
    db = FakeDB(user=target)

    result = AdminService.lock_user(db, admin, str(target.id), "Repeated policy violation")

    assert result.is_locked is True
    assert result.locked_reason == "Repeated policy violation"
    assert result.locked_at is not None
    assert db.committed is True
    audit = next(item for item in db.added if isinstance(item, AdminAuditLog))
    assert audit.action == "lock_user"
    assert audit.target_type == "user"
    assert audit.reason == "Repeated policy violation"


def test_unlock_user_clears_lock_fields_and_audit_log():
    admin = _admin()
    target = _user()
    target.is_locked = True
    target.locked_reason = "Old reason"
    db = FakeDB(user=target)

    result = AdminService.unlock_user(db, admin, str(target.id), "Appeal accepted")

    assert result.is_locked is False
    assert result.locked_reason is None
    assert result.locked_at is None
    audit = next(item for item in db.added if isinstance(item, AdminAuditLog))
    assert audit.action == "unlock_user"
    assert audit.reason == "Appeal accepted"


def test_override_chapter_moderation_updates_status_logs_moderation_and_audit():
    admin = _admin()
    chapter = _chapter()
    db = FakeDB(chapter=chapter)

    result = AdminService.override_chapter_moderation(
        db=db,
        admin=admin,
        chapter_id=str(chapter.id),
        decision="approved",
        reason="AI false positive",
    )

    assert result.moderation_status == "approved"
    assert db.committed is True
    moderation_log = next(item for item in db.added if isinstance(item, AIModerationLog))
    assert moderation_log.is_violation is False
    assert "Admin override" in moderation_log.reason
    audit = next(item for item in db.added if isinstance(item, AdminAuditLog))
    assert audit.action == "override_moderation"
    assert audit.target_type == "chapter"
    assert audit.reason == "AI false positive"


def test_revenue_series_reads_successful_transactions():
    transaction = Transaction(
        user_id=uuid.uuid4(),
        plan_id="MONTHLY",
        amount=49_000_000,
        vnp_txn_ref="YAG_TEST_001",
        status="success",
        created_at=datetime.now(timezone.utc),
    )
    db = FakeDB(transactions=[transaction])

    result = AdminService.get_revenue_series(db, "week")

    assert any(point["revenue"] == 49 for point in result["series"])
    assert sum(point["memberships"] for point in result["series"]) == 1


def test_report_data_aggregates_real_rows():
    created_at = datetime(2026, 5, 30, 8, 0, tzinfo=timezone.utc)
    user = _user()
    user.created_at = created_at
    chapter = _chapter()
    chapter.created_at = created_at
    transaction = Transaction(
        user_id=user.id,
        plan_id="MONTHLY",
        amount=49_000_000,
        vnp_txn_ref="YAG_TEST_002",
        status="success",
        created_at=created_at,
    )
    db = FakeDB(transactions=[transaction], users=[user], chapters=[chapter])

    result = AdminService.get_report_data(db, date(2026, 5, 30), date(2026, 5, 30), "revenue")

    assert result["rows"][0]["revenue"] == 49
    assert result["rows"][0]["memberships"] == 1
    assert result["rows"][0]["users"] == 1
    assert result["rows"][0]["content"] == 1
