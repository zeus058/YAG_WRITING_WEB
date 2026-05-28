-- =============================================================================
-- YAG — Smart Novel Writing Platform
-- Migration: V1__initial_schema.sql
-- Description: Initial database schema — creates all 13 tables, constraints,
--              and performance indexes for the YAG platform.
-- Author: Nguyễn Duy Trường
-- Created: 2026-05-28
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 0: Enable required PostgreSQL extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Provides gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for AI semantic search


-- =============================================================================
-- TABLE DEFINITIONS (ordered by dependency — independent tables first)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. users — User accounts & role-based access control
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50)     NOT NULL UNIQUE,
    email           VARCHAR(100)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            VARCHAR(20)     NOT NULL DEFAULT 'reader',
    premium_until   TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'author', 'reader'))
);

COMMENT ON TABLE  users IS 'Core user accounts with role-based access control';
COMMENT ON COLUMN users.premium_until IS 'NULL means no active membership; non-null = membership expiry datetime';


-- -----------------------------------------------------------------------------
-- 2. profiles — Extended user profile (1-to-1 with users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    user_id         UUID            PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name    VARCHAR(100)    NOT NULL,
    avatar_url      VARCHAR(255),
    bio             TEXT,
    reputation_score INTEGER        NOT NULL DEFAULT 100,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_profiles_reputation_score CHECK (reputation_score >= 0 AND reputation_score <= 100)
);

COMMENT ON TABLE  profiles IS '1-to-1 extended profile for each user';
COMMENT ON COLUMN profiles.reputation_score IS 'Author reputation 0–100; reduced when publish schedules are missed';


-- -----------------------------------------------------------------------------
-- 3. membership_plans — Membership tier catalogue
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_plans (
    id              VARCHAR(30)     PRIMARY KEY,   -- e.g. 'MONTHLY', 'YEARLY'
    name            VARCHAR(100)    NOT NULL,
    duration_days   INTEGER         NOT NULL,
    price           DECIMAL(12,2)   NOT NULL,      -- Unit: VND
    description     TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_membership_plans_duration_days CHECK (duration_days > 0),
    CONSTRAINT chk_membership_plans_price         CHECK (price >= 0.0)
);

COMMENT ON TABLE  membership_plans IS 'Available membership tiers (e.g. Monthly, Yearly)';
COMMENT ON COLUMN membership_plans.price IS 'Price in Vietnamese Dong (VND)';


-- -----------------------------------------------------------------------------
-- 4. stories — Novel / story works
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stories (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id   UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255)    NOT NULL UNIQUE,
    description TEXT            NOT NULL,
    cover_url   VARCHAR(255),
    category    VARCHAR(50)     NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'ongoing',
    view_count  INTEGER         NOT NULL DEFAULT 0,
    rating_avg  DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_stories_status              CHECK (status IN ('ongoing', 'completed', 'paused')),
    CONSTRAINT chk_stories_view_count_non_negative CHECK (view_count >= 0),
    CONSTRAINT chk_stories_rating_avg_range    CHECK (rating_avg >= 0.00 AND rating_avg <= 5.00)
);

COMMENT ON TABLE  stories IS 'Novel / story works created by authors';
COMMENT ON COLUMN stories.view_count IS 'Incremented in Redis, periodically flushed to PostgreSQL';
COMMENT ON COLUMN stories.rating_avg IS 'Computed from reviews table; updated on each new review';


-- -----------------------------------------------------------------------------
-- 5. chapters — Individual chapters belonging to a story
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id            UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    chapter_number      INTEGER     NOT NULL,
    title               VARCHAR(255) NOT NULL,
    content             TEXT        NOT NULL,
    moderation_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
    is_premium          BOOLEAN     NOT NULL DEFAULT FALSE,
    publish_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_chapters_chapter_number      CHECK (chapter_number > 0),
    CONSTRAINT chk_chapters_moderation_status   CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))
);

COMMENT ON TABLE  chapters IS 'Individual chapters of a story';
COMMENT ON COLUMN chapters.is_premium    IS 'TRUE = requires active membership to read';
COMMENT ON COLUMN chapters.publish_at    IS 'Scheduled or actual public publication datetime';


-- -----------------------------------------------------------------------------
-- 6. story_embeddings — pgvector AI semantic search vectors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS story_embeddings (
    story_id        UUID        PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
    plot_summary    TEXT        NOT NULL,
    embedding       vector(1536) NOT NULL,   -- Gemini text-embedding-004 output
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE  story_embeddings IS 'Vector embeddings for AI semantic search (pgvector)';
COMMENT ON COLUMN story_embeddings.embedding IS 'Gemini text-embedding-004, dim=1536; indexed with IVFFlat cosine';


-- -----------------------------------------------------------------------------
-- 7. reviews — Story ratings & written reviews
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    story_id    UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    rating      INTEGER     NOT NULL,
    content     TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_reviews_user_story     UNIQUE (user_id, story_id),
    CONSTRAINT chk_reviews_rating_range  CHECK  (rating >= 1 AND rating <= 5)
);

COMMENT ON TABLE reviews IS 'One review per user per story; triggers rating_avg update on stories';


-- -----------------------------------------------------------------------------
-- 8. comments — Chapter comments with nested reply support
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    chapter_id  UUID    NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    parent_id   UUID    REFERENCES comments(id) ON DELETE CASCADE,  -- NULL = top-level
    content     TEXT    NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE  comments IS 'Chapter comments; self-referencing for nested replies';
COMMENT ON COLUMN comments.parent_id IS 'NULL = top-level comment; non-null = reply to another comment';


-- -----------------------------------------------------------------------------
-- 9. ai_moderation_logs — Gemini content moderation results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_moderation_logs (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id          UUID        NOT NULL UNIQUE REFERENCES chapters(id) ON DELETE CASCADE,
    is_violation        BOOLEAN     NOT NULL DEFAULT FALSE,
    violation_category  VARCHAR(50),
    confidence_score    FLOAT,
    reason              TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_ai_moderation_logs_confidence_score_range
        CHECK (confidence_score IS NULL OR (confidence_score >= 0.0 AND confidence_score <= 1.0))
);

COMMENT ON TABLE  ai_moderation_logs IS 'Per-chapter Gemini AI moderation results (one-to-one with chapters)';


-- -----------------------------------------------------------------------------
-- 10. publish_schedules — Author content delivery schedules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publish_schedules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id        UUID        NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    scheduled_time  TIMESTAMP WITH TIME ZONE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_publish_schedules_status_valid
        CHECK (status IN ('scheduled', 'published', 'missed'))
);

COMMENT ON TABLE publish_schedules IS 'Scheduled publishing slots; cron job checks these hourly';


-- -----------------------------------------------------------------------------
-- 11. reading_histories — Per-user chapter read tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_histories (
    user_id     UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    chapter_id  UUID    NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    read_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (user_id, chapter_id)
);

COMMENT ON TABLE reading_histories IS 'Tracks the last time a user read each chapter';


-- -----------------------------------------------------------------------------
-- 12. libraries — User personal bookmarks (N:M users <-> stories)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS libraries (
    user_id         UUID    NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    story_id        UUID    NOT NULL REFERENCES stories(id)  ON DELETE CASCADE,
    bookmarked_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (user_id, story_id)
);

COMMENT ON TABLE libraries IS 'User bookmarked / saved stories (personal library)';


-- -----------------------------------------------------------------------------
-- 13. transactions — VNPAY payment transaction records
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            REFERENCES users(id) ON DELETE SET NULL,   -- preserved if user is deleted
    plan_id             VARCHAR(30)     NOT NULL REFERENCES membership_plans(id),
    amount              DECIMAL(12,2)   NOT NULL,
    vnp_txn_ref         VARCHAR(100)    NOT NULL UNIQUE,   -- Reference sent to VNPAY
    vnp_transaction_no  VARCHAR(100)    UNIQUE,            -- VNPAY's own transaction ID (nullable until confirmed)
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_transactions_amount_positive  CHECK (amount > 0),
    CONSTRAINT chk_transactions_status_valid     CHECK (status IN ('pending', 'success', 'failed'))
);

COMMENT ON TABLE  transactions IS 'VNPAY payment history; user_id SET NULL on account deletion to preserve audit trail';
COMMENT ON COLUMN transactions.vnp_txn_ref        IS 'UUID-based reference generated by YAG, sent to VNPAY checkout';
COMMENT ON COLUMN transactions.vnp_transaction_no IS 'Official transaction ID returned by VNPAY after payment';


-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- -------------------------
-- B-Tree indexes for common search / filter columns
-- -------------------------

-- stories: full-text title search and category filter
CREATE INDEX IF NOT EXISTS idx_stories_title
    ON stories (title);

CREATE INDEX IF NOT EXISTS idx_stories_category
    ON stories (category);

-- chapters: the primary access pattern — get all chapters for a story in order
CREATE INDEX IF NOT EXISTS idx_chapters_story_id_chapter_number
    ON chapters (story_id, chapter_number);

-- chapters: filter by moderation status (Admin moderation queue)
CREATE INDEX IF NOT EXISTS idx_chapters_moderation_status
    ON chapters (moderation_status);

-- publish_schedules: cron job queries by status + scheduled_time
CREATE INDEX IF NOT EXISTS idx_publish_schedules_status_time
    ON publish_schedules (status, scheduled_time);

-- -------------------------
-- Unique index for VNPAY transaction reference lookups
-- -------------------------

-- transactions: IPN callback looks up transaction by vnp_txn_ref
CREATE UNIQUE INDEX IF NOT EXISTS uidx_transactions_vnp_txn_ref
    ON transactions (vnp_txn_ref);

-- -------------------------
-- pgvector IVFFlat index for AI semantic search (Cosine Similarity)
-- -------------------------
-- NOTE: IVFFlat requires data to exist before building the index.
--       Run this separately AFTER seeding story_embeddings data, or
--       it will build with 0 lists (acceptable for development).
CREATE INDEX IF NOT EXISTS idx_story_embeddings_embedding
    ON story_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMENT ON INDEX idx_story_embeddings_embedding IS
    'IVFFlat cosine-similarity index for Gemini semantic search. '
    'Rebuild with REINDEX after bulk loading embeddings for best performance.';


-- =============================================================================
-- ALTER TABLE PATCHES
-- Applied when tables already existed from a prior schema version.
-- All statements are idempotent (IF NOT EXISTS / DROP ... IF EXISTS).
-- =============================================================================

-- membership_plans: add timestamps if they were missing in an earlier version
ALTER TABLE membership_plans
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- stories: add CHECK constraints that may not have been applied yet
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'stories'::regclass
          AND conname = 'chk_stories_view_count_non_negative'
    ) THEN
        ALTER TABLE stories
            ADD CONSTRAINT chk_stories_view_count_non_negative CHECK (view_count >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'stories'::regclass
          AND conname = 'chk_stories_rating_avg_range'
    ) THEN
        ALTER TABLE stories
            ADD CONSTRAINT chk_stories_rating_avg_range CHECK (rating_avg >= 0.00 AND rating_avg <= 5.00);
    END IF;
END
$$;

-- =============================================================================
-- END OF MIGRATION V1
-- =============================================================================
