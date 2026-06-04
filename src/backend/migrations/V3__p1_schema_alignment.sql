-- =============================================================================
-- Migration: V3__p1_schema_alignment.sql
-- Description: Align ORM, backend contracts, and PostgreSQL schema for P1 plan.
-- Idempotent: safe to run multiple times on development/staging databases.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_users_username_lower
  ON users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS uidx_users_email_lower
  ON users (LOWER(email));

-- ---------------------------------------------------------------------------
-- stories / chapters
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_stories_author_id
  ON stories(author_id);

CREATE INDEX IF NOT EXISTS idx_stories_category_status
  ON stories(category, status);

CREATE INDEX IF NOT EXISTS idx_stories_rating
  ON stories(rating_avg DESC);

ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'chapters'::regclass
      AND conname = 'uq_chapters_story_chapter_number'
  ) THEN
    ALTER TABLE chapters
      ADD CONSTRAINT uq_chapters_story_chapter_number UNIQUE (story_id, chapter_number);
  END IF;
END
$$;

ALTER TABLE chapters
  DROP CONSTRAINT IF EXISTS chk_chapters_moderation_status;

ALTER TABLE chapters
  ADD CONSTRAINT chk_chapters_moderation_status
  CHECK (moderation_status IN ('draft', 'pending', 'approved', 'rejected', 'flagged'));

CREATE INDEX IF NOT EXISTS idx_chapters_story_status_publish
  ON chapters(story_id, moderation_status, publish_at);

CREATE INDEX IF NOT EXISTS idx_chapters_moderation_status
  ON chapters(moderation_status);

-- ---------------------------------------------------------------------------
-- story_embeddings
-- ---------------------------------------------------------------------------
ALTER TABLE story_embeddings
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-004',
  ADD COLUMN IF NOT EXISTS source_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS last_embedded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_story_embeddings_embedding_cosine
  ON story_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ---------------------------------------------------------------------------
-- comments / reviews
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_comments_chapter_created
  ON comments(chapter_id, created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user_id
  ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id
  ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_reviews_story_id
  ON reviews(story_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews(user_id);

-- ---------------------------------------------------------------------------
-- membership / payment
-- ---------------------------------------------------------------------------
ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS vnp_response_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vnp_transaction_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ipn_received_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS raw_ipn_payload JSONB;

CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_plan_id
  ON transactions(plan_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status_created
  ON transactions(status, created_at);

-- ---------------------------------------------------------------------------
-- moderation
-- ---------------------------------------------------------------------------
ALTER TABLE ai_moderation_logs
  ADD COLUMN IF NOT EXISTS model_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS raw_response JSONB,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(20) NOT NULL DEFAULT 'worker';

CREATE INDEX IF NOT EXISTS idx_ai_moderation_logs_chapter_id
  ON ai_moderation_logs(chapter_id);

CREATE INDEX IF NOT EXISTS idx_ai_moderation_logs_violation
  ON ai_moderation_logs(is_violation, created_at);

-- ---------------------------------------------------------------------------
-- publish schedules
-- ---------------------------------------------------------------------------
ALTER TABLE publish_schedules
  ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cadence VARCHAR(30),
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS missed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE publish_schedules
  DROP CONSTRAINT IF EXISTS chk_publish_schedules_status_valid;

ALTER TABLE publish_schedules
  ADD CONSTRAINT chk_publish_schedules_status_valid
  CHECK (status IN ('scheduled', 'published', 'missed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_publish_schedules_due
  ON publish_schedules(status, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_publish_schedules_story_id
  ON publish_schedules(story_id);

-- ---------------------------------------------------------------------------
-- persistent notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id)
  WHERE read_at IS NULL;

-- ---------------------------------------------------------------------------
-- reading history / library / admin indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_reading_histories_chapter_id
  ON reading_histories(chapter_id);

CREATE INDEX IF NOT EXISTS idx_reading_histories_user_read_at
  ON reading_histories(user_id, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_libraries_story_id
  ON libraries(story_id);

CREATE INDEX IF NOT EXISTS idx_libraries_user_bookmarked
  ON libraries(user_id, bookmarked_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_unresolved
  ON admin_alerts(severity, created_at DESC)
  WHERE is_resolved IS FALSE;

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_created
  ON admin_audit_logs(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target
  ON admin_audit_logs(target_type, target_id);

-- ---------------------------------------------------------------------------
-- updated_at helper trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'profiles',
    'stories',
    'chapters',
    'comments',
    'reviews',
    'membership_plans',
    'transactions',
    'publish_schedules',
    'notifications',
    'admin_alerts'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END
$$;

