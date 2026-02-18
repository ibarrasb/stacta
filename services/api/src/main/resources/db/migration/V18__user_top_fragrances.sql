CREATE TABLE IF NOT EXISTS user_top_fragrance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_collection_item_id UUID NOT NULL REFERENCES user_collection_item(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_top_fragrance_item UNIQUE (user_collection_item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_top_fragrance_user_created
  ON user_top_fragrance(user_id, created_at ASC);
