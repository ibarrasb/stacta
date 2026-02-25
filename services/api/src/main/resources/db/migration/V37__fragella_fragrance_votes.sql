CREATE TABLE IF NOT EXISTS fragella_fragrance_vote (
  external_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  longevity_score INTEGER NULL,
  sillage_score INTEGER NULL,
  price_perception VARCHAR(20) NULL,
  season_votes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  occasion_votes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (external_id, user_id),
  CONSTRAINT chk_fragella_vote_longevity CHECK (longevity_score IS NULL OR (longevity_score BETWEEN 1 AND 5)),
  CONSTRAINT chk_fragella_vote_sillage CHECK (sillage_score IS NULL OR (sillage_score BETWEEN 1 AND 5)),
  CONSTRAINT chk_fragella_vote_price CHECK (
    price_perception IS NULL OR price_perception IN ('GREAT_VALUE', 'FAIR', 'OVERPRICED')
  ),
  CONSTRAINT chk_fragella_vote_season_json CHECK (jsonb_typeof(season_votes_json) = 'array'),
  CONSTRAINT chk_fragella_vote_occasion_json CHECK (jsonb_typeof(occasion_votes_json) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_fragella_vote_external_id
  ON fragella_fragrance_vote(external_id);
