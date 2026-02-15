CREATE TABLE IF NOT EXISTS user_follow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ NULL,
  CHECK (status IN ('PENDING', 'ACCEPTED')),
  CHECK (follower_user_id <> following_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_follow_pair
  ON user_follow(follower_user_id, following_user_id);

CREATE INDEX IF NOT EXISTS idx_user_follow_following_status_created
  ON user_follow(following_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_follow_follower_status_created
  ON user_follow(follower_user_id, status, created_at DESC);
