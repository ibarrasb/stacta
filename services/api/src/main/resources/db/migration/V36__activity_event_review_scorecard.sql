ALTER TABLE activity_event
  ADD COLUMN IF NOT EXISTS fragrance_source TEXT NULL,
  ADD COLUMN IF NOT EXISTS fragrance_external_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS fragrance_image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_rating INTEGER NULL,
  ADD COLUMN IF NOT EXISTS review_performance TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_season TEXT NULL,
  ADD COLUMN IF NOT EXISTS review_occasion TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_event_review_lookup
  ON activity_event(type, actor_user_id, created_at DESC)
  WHERE type = 'REVIEW_POSTED';
