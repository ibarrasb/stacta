UPDATE users
SET
  followers_count = GREATEST(0, COALESCE(followers_count, 0)),
  following_count = GREATEST(0, COALESCE(following_count, 0));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_followers_count_non_negative'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_followers_count_non_negative CHECK (followers_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_users_following_count_non_negative'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT chk_users_following_count_non_negative CHECK (following_count >= 0);
  END IF;
END $$;
