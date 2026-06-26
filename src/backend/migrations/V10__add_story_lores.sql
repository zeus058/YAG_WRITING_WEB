-- V10: Add story_lores table for Lorebook / Contextual RAG feature
-- Stores character, location, item, skill entries per story

CREATE TABLE IF NOT EXISTS story_lores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    entity_name VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_lores_story_id ON story_lores(story_id);
CREATE INDEX IF NOT EXISTS idx_story_lores_entity_name ON story_lores(entity_name);
