-- =============================================================================
-- Migration: V13__add_last_embedded_at.sql
-- Description: Add missing last_embedded_at column to story_embeddings.
--   This column was defined in V3 but may not have been applied on all
--   environments. The sync_story_embedding function references this column
--   in its ON CONFLICT DO UPDATE clause, causing silent failures without it.
-- Idempotent: safe to run multiple times.
-- =============================================================================

ALTER TABLE story_embeddings
  ADD COLUMN IF NOT EXISTS last_embedded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
