ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_object_key TEXT;

ALTER TABLE fragrance
  ADD COLUMN IF NOT EXISTS image_object_key TEXT;
