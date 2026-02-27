CREATE TABLE IF NOT EXISTS review_like (
  review_id UUID NOT NULL REFERENCES activity_event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_like_user_created
  ON review_like(user_id, created_at DESC);

ALTER TABLE notification_event
  ADD COLUMN IF NOT EXISTS source_review_id UUID NULL REFERENCES activity_event(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS aggregate_count INTEGER NOT NULL DEFAULT 1;

UPDATE notification_event
SET aggregate_count = 1
WHERE aggregate_count IS NULL OR aggregate_count < 1;

ALTER TABLE notification_event
  DROP CONSTRAINT IF EXISTS notification_event_type_check;

ALTER TABLE notification_event
  ADD CONSTRAINT notification_event_type_check
  CHECK (type IN ('FOLLOWED_YOU', 'FOLLOWED_YOU_BACK', 'MODERATION_STRIKE', 'REVIEW_LIKED'));

ALTER TABLE notification_event
  DROP CONSTRAINT IF EXISTS notification_event_aggregate_count_check;

ALTER TABLE notification_event
  ADD CONSTRAINT notification_event_aggregate_count_check
  CHECK (aggregate_count >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event_review_like
  ON notification_event(recipient_user_id, source_review_id, type);

CREATE INDEX IF NOT EXISTS idx_notification_event_review_like_lookup
  ON notification_event(source_review_id, recipient_user_id)
  WHERE source_review_id IS NOT NULL;
