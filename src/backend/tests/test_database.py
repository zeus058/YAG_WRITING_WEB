"""
Database Integration Tests — YAG Platform
==========================================
Verifies that:
  1. PostgreSQL connection is alive.
  2. The pgvector extension is installed.
  3. All 13 tables are created with the correct columns.
  4. All required performance indexes exist.
  5. CHECK constraints reject invalid data.
  6. Basic CRUD operations work on the 4 tables owned by Duy Trường:
       stories, chapters, membership_plans, transactions.

Run from project root (SE_Writing_Web/src/backend/):
    pytest tests/test_database.py -v
"""
import uuid
import pytest
from decimal import Decimal
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError

# ── Connection (matches docker-compose & .env) ────────────────────────────────
DATABASE_URL = "postgresql://yag_user:yag_secret@localhost:5432/yag_db"

@pytest.fixture(scope="session")
def engine():
    eng = create_engine(DATABASE_URL, pool_pre_ping=True)
    yield eng
    eng.dispose()

@pytest.fixture(scope="session")
def session(engine):
    SessionLocal = sessionmaker(bind=engine)
    sess = SessionLocal()
    yield sess
    sess.close()


# =============================================================================
# 1. Connectivity & Extension
# =============================================================================

class TestConnectivity:
    def test_postgres_connection(self, engine):
        """DB server is reachable and returns a version string."""
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()")).scalar()
        assert "PostgreSQL" in result, f"Unexpected version string: {result}"
        print(f"\n  ✅ Connected → {result[:60]}...")

    def test_pgvector_extension(self, engine):
        """pgvector extension is installed (required for AI semantic search)."""
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            ).fetchone()
        assert result is not None, "❌ pgvector extension is NOT installed!"
        print("\n  ✅ pgvector extension is active.")


# =============================================================================
# 2. All 13 Tables Exist
# =============================================================================

EXPECTED_TABLES = [
    "users", "profiles", "stories", "chapters",
    "story_embeddings", "reviews", "comments",
    "ai_moderation_logs", "publish_schedules",
    "reading_histories", "libraries",
    "membership_plans", "transactions",
]

class TestTablesExist:
    @pytest.mark.parametrize("table_name", EXPECTED_TABLES)
    def test_table_exists(self, engine, table_name):
        """Every one of the 13 schema tables must exist."""
        insp = inspect(engine)
        tables = insp.get_table_names()
        assert table_name in tables, f"❌ Table '{table_name}' is MISSING from the database!"
        print(f"\n  ✅ Table '{table_name}' exists.")


# =============================================================================
# 3. Key Column Checks (Duy Trường's tables)
# =============================================================================

class TestColumnStructure:
    def _col_names(self, engine, table):
        insp = inspect(engine)
        return {c["name"] for c in insp.get_columns(table)}

    def test_stories_columns(self, engine):
        cols = self._col_names(engine, "stories")
        required = {"id", "author_id", "title", "description", "cover_url",
                    "category", "status", "view_count", "rating_avg",
                    "created_at", "updated_at"}
        missing = required - cols
        assert not missing, f"stories is missing columns: {missing}"
        print(f"\n  ✅ stories columns: {sorted(cols)}")

    def test_chapters_columns(self, engine):
        cols = self._col_names(engine, "chapters")
        required = {"id", "story_id", "chapter_number", "title", "content",
                    "moderation_status", "is_premium", "publish_at",
                    "created_at", "updated_at"}
        missing = required - cols
        assert not missing, f"chapters is missing columns: {missing}"
        print(f"\n  ✅ chapters columns: {sorted(cols)}")

    def test_membership_plans_columns(self, engine):
        cols = self._col_names(engine, "membership_plans")
        required = {"id", "name", "duration_days", "price", "description",
                    "created_at", "updated_at"}
        missing = required - cols
        assert not missing, f"membership_plans is missing columns: {missing}"
        print(f"\n  ✅ membership_plans columns: {sorted(cols)}")

    def test_transactions_columns(self, engine):
        cols = self._col_names(engine, "transactions")
        required = {"id", "user_id", "plan_id", "amount",
                    "vnp_txn_ref", "vnp_transaction_no", "status",
                    "created_at", "updated_at"}
        missing = required - cols
        assert not missing, f"transactions is missing columns: {missing}"
        print(f"\n  ✅ transactions columns: {sorted(cols)}")


# =============================================================================
# 4. Performance Indexes Exist
# =============================================================================

EXPECTED_INDEXES = {
    "stories":          ["idx_stories_title", "idx_stories_category"],
    "chapters":         ["idx_chapters_story_id_chapter_number"],
    "transactions":     ["uidx_transactions_vnp_txn_ref"],
    "story_embeddings": ["idx_story_embeddings_embedding"],
}

class TestIndexes:
    @pytest.mark.parametrize("table,index_names", EXPECTED_INDEXES.items())
    def test_indexes_exist(self, engine, table, index_names):
        """Required B-Tree and IVFFlat indexes must exist."""
        insp = inspect(engine)
        existing = {idx["name"] for idx in insp.get_indexes(table)}
        for idx_name in index_names:
            assert idx_name in existing, (
                f"❌ Index '{idx_name}' on '{table}' is MISSING! "
                f"Existing indexes: {existing}"
            )
            print(f"\n  ✅ Index '{idx_name}' on '{table}' exists.")


# =============================================================================
# 5. CHECK Constraint Enforcement
# =============================================================================

class TestCheckConstraints:
    """These tests INSERT invalid data and assert the DB rejects it."""

    def _make_user(self, session) -> uuid.UUID:
        """Helper: insert a minimal user row for FK dependencies."""
        uid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES (:id, :uname, :email, :pw, 'author')
            ON CONFLICT DO NOTHING
        """), {"id": str(uid), "uname": f"tester_{uid.hex[:8]}",
               "email": f"tester_{uid.hex[:8]}@test.com", "pw": "bcrypt_hash"})
        session.commit()
        return uid

    def _make_story(self, session, author_id) -> uuid.UUID:
        """Helper: insert a minimal story row."""
        sid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO stories (id, author_id, title, description, category)
            VALUES (:id, :aid, :title, 'desc', 'Kiếm hiệp')
        """), {"id": str(sid), "aid": str(author_id),
               "title": f"Story_{sid.hex[:8]}"})
        session.commit()
        return sid

    def test_stories_invalid_status(self, session):
        """stories.status must be one of ('ongoing','completed','paused')."""
        author_id = self._make_user(session)
        sid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO stories (id, author_id, title, description, category, status)
                VALUES (:id, :aid, :title, 'desc', 'Test', 'INVALID_STATUS')
            """), {"id": str(sid), "aid": str(author_id),
                   "title": f"BadStory_{sid.hex[:8]}"})
            session.commit()
        session.rollback()
        print("\n  ✅ stories CHECK(status) correctly rejected 'INVALID_STATUS'.")

    def test_stories_negative_view_count(self, session):
        """stories.view_count must be >= 0."""
        author_id = self._make_user(session)
        sid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO stories (id, author_id, title, description, category, view_count)
                VALUES (:id, :aid, :title, 'desc', 'Test', -1)
            """), {"id": str(sid), "aid": str(author_id),
                   "title": f"NegView_{sid.hex[:8]}"})
            session.commit()
        session.rollback()
        print("\n  ✅ stories CHECK(view_count >= 0) correctly rejected -1.")

    def test_stories_invalid_rating_avg(self, session):
        """stories.rating_avg must be between 0.00 and 5.00."""
        author_id = self._make_user(session)
        sid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO stories (id, author_id, title, description, category, rating_avg)
                VALUES (:id, :aid, :title, 'desc', 'Test', 9.99)
            """), {"id": str(sid), "aid": str(author_id),
                   "title": f"BadRating_{sid.hex[:8]}"})
            session.commit()
        session.rollback()
        print("\n  ✅ stories CHECK(rating_avg 0–5) correctly rejected 9.99.")

    def test_chapters_invalid_moderation_status(self, session):
        """chapters.moderation_status must be pending/approved/rejected/flagged."""
        author_id = self._make_user(session)
        story_id  = self._make_story(session, author_id)
        cid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO chapters (id, story_id, chapter_number, title, content, moderation_status)
                VALUES (:id, :sid, 1, 'Chapter 1', 'Content', 'UNKNOWN')
            """), {"id": str(cid), "sid": str(story_id)})
            session.commit()
        session.rollback()
        print("\n  ✅ chapters CHECK(moderation_status) correctly rejected 'UNKNOWN'.")

    def test_chapters_zero_chapter_number(self, session):
        """chapters.chapter_number must be > 0."""
        author_id = self._make_user(session)
        story_id  = self._make_story(session, author_id)
        cid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO chapters (id, story_id, chapter_number, title, content)
                VALUES (:id, :sid, 0, 'Bad Chapter', 'Content')
            """), {"id": str(cid), "sid": str(story_id)})
            session.commit()
        session.rollback()
        print("\n  ✅ chapters CHECK(chapter_number > 0) correctly rejected 0.")

    def test_transactions_invalid_status(self, session):
        """transactions.status must be pending/success/failed."""
        # Insert plan first
        session.execute(text("""
            INSERT INTO membership_plans (id, name, duration_days, price)
            VALUES ('TEST_PLAN', 'Test Plan', 30, 99000)
            ON CONFLICT DO NOTHING
        """))
        session.commit()
        author_id = self._make_user(session)
        tid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO transactions (id, user_id, plan_id, amount, vnp_txn_ref, status)
                VALUES (:id, :uid, 'TEST_PLAN', 99000, :ref, 'CANCELLED')
            """), {"id": str(tid), "uid": str(author_id),
                   "ref": f"REF_{tid.hex[:12]}"})
            session.commit()
        session.rollback()
        print("\n  ✅ transactions CHECK(status) correctly rejected 'CANCELLED'.")

    def test_transactions_negative_amount(self, session):
        """transactions.amount must be > 0."""
        session.execute(text("""
            INSERT INTO membership_plans (id, name, duration_days, price)
            VALUES ('TEST_PLAN2', 'Test Plan 2', 30, 99000)
            ON CONFLICT DO NOTHING
        """))
        session.commit()
        author_id = self._make_user(session)
        tid = uuid.uuid4()
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO transactions (id, user_id, plan_id, amount, vnp_txn_ref)
                VALUES (:id, :uid, 'TEST_PLAN2', -500, :ref)
            """), {"id": str(tid), "uid": str(author_id),
                   "ref": f"REF_{tid.hex[:12]}"})
            session.commit()
        session.rollback()
        print("\n  ✅ transactions CHECK(amount > 0) correctly rejected -500.")

    def test_membership_plans_negative_price(self, session):
        """membership_plans.price must be >= 0."""
        with pytest.raises(IntegrityError):
            session.execute(text("""
                INSERT INTO membership_plans (id, name, duration_days, price)
                VALUES ('BAD_PLAN', 'Bad Plan', 30, -100)
            """))
            session.commit()
        session.rollback()
        print("\n  ✅ membership_plans CHECK(price >= 0) correctly rejected -100.")


# =============================================================================
# 6. Basic CRUD — Duy Trường's 4 tables
# =============================================================================

class TestCRUD:
    def test_full_membership_and_transaction_flow(self, session):
        """
        End-to-end: create user → membership plan → transaction → verify FK cascade.
        """
        # 1. Create user
        uid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES (:id, :u, :e, 'bcrypt$hash', 'reader')
        """), {"id": str(uid), "u": f"reader_{uid.hex[:6]}",
               "e": f"reader_{uid.hex[:6]}@yag.vn"})

        # 2. Create membership plan
        session.execute(text("""
            INSERT INTO membership_plans (id, name, duration_days, price, description)
            VALUES ('MONTHLY_TEST', 'Gói Bạc 1 Tháng', 30, 49000,
                    'Đọc không giới hạn chương Premium trong 30 ngày.')
            ON CONFLICT DO NOTHING
        """))

        # 3. Create transaction (pending)
        tid = uuid.uuid4()
        txn_ref = f"YAG_{tid.hex[:16].upper()}"
        session.execute(text("""
            INSERT INTO transactions (id, user_id, plan_id, amount, vnp_txn_ref, status)
            VALUES (:id, :uid, 'MONTHLY_TEST', 49000, :ref, 'pending')
        """), {"id": str(tid), "uid": str(uid), "ref": txn_ref})
        session.commit()

        # 4. Simulate VNPAY IPN success → update to 'success'
        session.execute(text("""
            UPDATE transactions
            SET status = 'success', vnp_transaction_no = :vno
            WHERE id = :id
        """), {"vno": f"VNP_{tid.hex[:10].upper()}", "id": str(tid)})

        # 5. Grant premium to user
        session.execute(text("""
            UPDATE users
            SET premium_until = NOW() + INTERVAL '30 days'
            WHERE id = :id
        """), {"id": str(uid)})
        session.commit()

        # 6. Verify
        row = session.execute(
            text("SELECT status, vnp_transaction_no FROM transactions WHERE id = :id"),
            {"id": str(tid)}
        ).fetchone()
        assert row.status == "success"
        assert row.vnp_transaction_no is not None

        premium_row = session.execute(
            text("SELECT premium_until FROM users WHERE id = :id"),
            {"id": str(uid)}
        ).fetchone()
        assert premium_row.premium_until is not None
        print(f"\n  ✅ CRUD flow: user→plan→txn→premium all succeeded. premium_until={premium_row.premium_until}")

    def test_story_and_chapter_cascade_delete(self, session):
        """Deleting a story must cascade-delete all its chapters."""
        uid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO users (id, username, email, password_hash, role)
            VALUES (:id, :u, :e, 'bcrypt$hash', 'author')
        """), {"id": str(uid), "u": f"author_{uid.hex[:6]}",
               "e": f"auth_{uid.hex[:6]}@yag.vn"})

        sid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO stories (id, author_id, title, description, category)
            VALUES (:id, :aid, :title, 'A great story', 'Kỳ ảo')
        """), {"id": str(sid), "aid": str(uid),
               "title": f"CascadeTest_{sid.hex[:8]}"})

        cid = uuid.uuid4()
        session.execute(text("""
            INSERT INTO chapters (id, story_id, chapter_number, title, content)
            VALUES (:id, :sid, 1, 'Chapter 1', 'Once upon a time...')
        """), {"id": str(cid), "sid": str(sid)})
        session.commit()

        # Verify chapter exists
        ch_count = session.execute(
            text("SELECT COUNT(*) FROM chapters WHERE story_id = :sid"),
            {"sid": str(sid)}
        ).scalar()
        assert ch_count == 1

        # Delete story → chapters should cascade-delete
        session.execute(text("DELETE FROM stories WHERE id = :id"), {"id": str(sid)})
        session.commit()

        ch_count_after = session.execute(
            text("SELECT COUNT(*) FROM chapters WHERE story_id = :sid"),
            {"sid": str(sid)}
        ).scalar()
        assert ch_count_after == 0
        print("\n  ✅ CASCADE DELETE: deleting story correctly removed all its chapters.")
