CREATE TABLE IF NOT EXISTS fragrance_rating (
  user_id UUID NOT NULL,
  external_source VARCHAR(20) NOT NULL,
  external_id VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, external_source, external_id),
  CONSTRAINT fk_fragrance_rating_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT chk_fragrance_rating_value CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_fragrance_rating_target
  ON fragrance_rating(external_source, external_id);
