CREATE TABLE IF NOT EXISTS review_repost (
  review_id UUID NOT NULL REFERENCES activity_event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_repost_user_created
  ON review_repost(user_id, created_at DESC);

ALTER TABLE activity_event
  ADD COLUMN IF NOT EXISTS source_review_id UUID NULL REFERENCES activity_event(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_event_review_repost_actor_source
  ON activity_event(actor_user_id, type, source_review_id)
  WHERE type = 'REVIEW_REPOSTED' AND source_review_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_event_source_review
  ON activity_event(source_review_id)
  WHERE source_review_id IS NOT NULL;
