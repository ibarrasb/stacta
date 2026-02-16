CREATE TABLE IF NOT EXISTS notification_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  source_follow_id UUID NULL REFERENCES user_follow(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipient_user_id <> actor_user_id),
  CHECK (type IN ('FOLLOWED_YOU', 'FOLLOWED_YOU_BACK'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event_source_follow
  ON notification_event(source_follow_id);

CREATE INDEX IF NOT EXISTS idx_notification_event_recipient_created
  ON notification_event(recipient_user_id, created_at DESC, id DESC);

INSERT INTO notification_event (recipient_user_id, actor_user_id, type, source_follow_id, created_at)
SELECT
  fr.following_user_id,
  fr.follower_user_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM user_follow fr2
      WHERE fr2.follower_user_id = fr.following_user_id
        AND fr2.following_user_id = fr.follower_user_id
        AND fr2.status = 'ACCEPTED'
    ) THEN 'FOLLOWED_YOU_BACK'
    ELSE 'FOLLOWED_YOU'
  END,
  fr.id,
  COALESCE(fr.responded_at, fr.created_at)
FROM user_follow fr
WHERE fr.status = 'ACCEPTED'
ON CONFLICT (source_follow_id) DO NOTHING;
