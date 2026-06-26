-- =============================================================================
-- Migration: V2__hotfix_users_lock_columns.sql
-- Description: Add missing `is_locked`, `locked_reason`, `locked_at` columns to users table.
-- Idempotent: safe to run multiple times; uses IF NOT EXISTS semantics.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_reason TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Ensure the chk_users_role constraint exists (defensive)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'users'::regclass
          AND conname = 'chk_users_role'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_role CHECK (role IN ('admin', 'author', 'reader'));
    END IF;
END
$$;
