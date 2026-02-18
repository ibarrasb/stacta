CREATE TABLE IF NOT EXISTS activity_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  fragrance_name TEXT NULL,
  review_excerpt TEXT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  reposts_count INTEGER NOT NULL DEFAULT 0,
  source_follow_id UUID NULL REFERENCES user_follow(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type IN ('USER_FOLLOWED_USER', 'REVIEW_POSTED', 'COLLECTION_ITEM_ADDED', 'WISHLIST_ITEM_ADDED', 'REVIEW_REPOSTED')),
  CHECK (likes_count >= 0 AND comments_count >= 0 AND reposts_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_event_source_follow
  ON activity_event(source_follow_id);

CREATE INDEX IF NOT EXISTS idx_activity_event_actor_created
  ON activity_event(actor_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_activity_event_type_created
  ON activity_event(type, created_at DESC, id DESC);

INSERT INTO activity_event (actor_user_id, target_user_id, type, source_follow_id, created_at)
SELECT
  fr.follower_user_id,
  fr.following_user_id,
  'USER_FOLLOWED_USER',
  fr.id,
  COALESCE(fr.responded_at, fr.created_at)
FROM user_follow fr
WHERE fr.status = 'ACCEPTED'
ON CONFLICT (source_follow_id) DO NOTHING;
