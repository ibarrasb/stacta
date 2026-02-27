CREATE TABLE IF NOT EXISTS review_comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES activity_event(id) ON DELETE CASCADE,
  parent_comment_id UUID NULL REFERENCES review_comment(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_comment_review_created
  ON review_comment(review_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_review_comment_parent_created
  ON review_comment(parent_comment_id, created_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS review_comment_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES review_comment(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('OPEN', 'RESOLVED'))
);

CREATE INDEX IF NOT EXISTS idx_review_comment_report_comment_status
  ON review_comment_report(comment_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_comment_report_open_by_user
  ON review_comment_report(comment_id, reported_by_user_id)
  WHERE status = 'OPEN';

DROP INDEX IF EXISTS uq_notification_event_review_like;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event_review_like
  ON notification_event(recipient_user_id, source_review_id, type)
  WHERE type = 'REVIEW_LIKED';

ALTER TABLE notification_event
  ADD COLUMN IF NOT EXISTS source_comment_id UUID NULL REFERENCES review_comment(id) ON DELETE CASCADE;

ALTER TABLE notification_event
  DROP CONSTRAINT IF EXISTS notification_event_type_check;

ALTER TABLE notification_event
  ADD CONSTRAINT notification_event_type_check
  CHECK (type IN (
    'FOLLOWED_YOU',
    'FOLLOWED_YOU_BACK',
    'MODERATION_STRIKE',
    'REVIEW_LIKED',
    'REVIEW_COMMENTED',
    'REVIEW_COMMENT_REPLIED'
  ));

CREATE INDEX IF NOT EXISTS idx_notification_event_source_comment
  ON notification_event(source_comment_id)
  WHERE source_comment_id IS NOT NULL;
