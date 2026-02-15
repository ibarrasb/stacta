ALTER TABLE users
  ADD COLUMN IF NOT EXISTS followers_count BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count BIGINT NOT NULL DEFAULT 0;

UPDATE users u
SET
  followers_count = COALESCE((
    SELECT COUNT(*)::BIGINT
    FROM user_follow fr
    WHERE fr.following_user_id = u.id
      AND fr.status = 'ACCEPTED'
  ), 0),
  following_count = COALESCE((
    SELECT COUNT(*)::BIGINT
    FROM user_follow fr
    WHERE fr.follower_user_id = u.id
      AND fr.status = 'ACCEPTED'
  ), 0);
