-- Add author-provided reference metadata for AI writing style fallback.

ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS style_reference_story_title VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS style_reference_series_title VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS style_reference_author VARCHAR(255) NULL;
