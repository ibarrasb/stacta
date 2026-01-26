-- Enforce case-insensitive unique usernames (only when username is not null)
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq
ON users (lower(username))
WHERE username IS NOT NULL;
