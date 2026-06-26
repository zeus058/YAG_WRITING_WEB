-- SQL Migration V7: Story Commitments
ALTER TABLE stories ADD COLUMN expected_chapters INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stories ADD COLUMN update_frequency VARCHAR(50) NOT NULL DEFAULT '1_week_1_chap';
ALTER TABLE profiles ALTER COLUMN reputation_score SET DEFAULT 95;
