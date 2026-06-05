-- Add richer story setup metadata for Author story creation/settings.

ALTER TABLE stories
    ADD COLUMN IF NOT EXISTS language VARCHAR(30) NOT NULL DEFAULT 'vi',
    ADD COLUMN IF NOT EXISTS story_type VARCHAR(30) NOT NULL DEFAULT 'fiction',
    ADD COLUMN IF NOT EXISTS tags TEXT NULL,
    ADD COLUMN IF NOT EXISTS copyright VARCHAR(50) NOT NULL DEFAULT 'all_rights_reserved',
    ADD COLUMN IF NOT EXISTS is_mature BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS main_characters TEXT NULL,
    ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) NULL;
