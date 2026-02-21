CREATE TABLE IF NOT EXISTS creator_reputation_rating (
  rater_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (rater_user_id, creator_user_id),
  CONSTRAINT chk_creator_reputation_rating_value CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_creator_reputation_no_self CHECK (rater_user_id <> creator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_reputation_creator
  ON creator_reputation_rating(creator_user_id);
