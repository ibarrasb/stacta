CREATE TABLE IF NOT EXISTS user_collection_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fragrance_source TEXT NOT NULL,
  fragrance_external_id TEXT NOT NULL,
  fragrance_name TEXT NOT NULL,
  fragrance_brand TEXT NULL,
  fragrance_image_url TEXT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_collection_item UNIQUE (user_id, fragrance_source, fragrance_external_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collection_item_user_added
  ON user_collection_item(user_id, added_at DESC);
