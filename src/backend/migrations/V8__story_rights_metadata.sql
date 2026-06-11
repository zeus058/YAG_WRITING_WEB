-- Track provenance and reuse rights for imported or generated stories.

CREATE TABLE IF NOT EXISTS story_rights (
    story_id UUID PRIMARY KEY REFERENCES stories(id) ON DELETE CASCADE,
    source_type VARCHAR(40) NOT NULL,
    original_author VARCHAR(255),
    rights_holder VARCHAR(255) NOT NULL,
    source_url TEXT,
    license_code VARCHAR(80) NOT NULL,
    license_url TEXT,
    commercial_use_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    derivatives_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    translation_rights VARCHAR(80),
    provenance_note TEXT NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    verified_by VARCHAR(255) NOT NULL,
    import_batch_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_story_rights_source_type CHECK (
        source_type IN (
            'synthetic_original',
            'owned_original',
            'licensed',
            'public_domain',
            'creative_commons'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_story_rights_source_type
    ON story_rights(source_type);

CREATE INDEX IF NOT EXISTS idx_story_rights_import_batch
    ON story_rights(import_batch_id);

DROP TRIGGER IF EXISTS trg_story_rights_updated_at ON story_rights;
CREATE TRIGGER trg_story_rights_updated_at
    BEFORE UPDATE ON story_rights
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
