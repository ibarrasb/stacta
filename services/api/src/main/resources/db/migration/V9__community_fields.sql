-- community fields on fragrance
ALTER TABLE fragrance
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS concentration VARCHAR(50),
  ADD COLUMN IF NOT EXISTS longevity_score INTEGER,
  ADD COLUMN IF NOT EXISTS sillage_score INTEGER;

-- snapshot should be safe for community rows too
ALTER TABLE fragrance
  ALTER COLUMN snapshot SET DEFAULT '{}'::jsonb;

-- constraints (Postgres doesn't support "ADD CONSTRAINT IF NOT EXISTS")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fragrance_visibility'
  ) THEN
    ALTER TABLE fragrance
      ADD CONSTRAINT chk_fragrance_visibility
      CHECK (visibility IN ('PRIVATE', 'PUBLIC'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fragrance_longevity_score'
  ) THEN
    ALTER TABLE fragrance
      ADD CONSTRAINT chk_fragrance_longevity_score
      CHECK (longevity_score IS NULL OR longevity_score BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fragrance_sillage_score'
  ) THEN
    ALTER TABLE fragrance
      ADD CONSTRAINT chk_fragrance_sillage_score
      CHECK (sillage_score IS NULL OR sillage_score BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fragrance_created_by_user'
  ) THEN
    ALTER TABLE fragrance
      ADD CONSTRAINT fk_fragrance_created_by_user
      FOREIGN KEY (created_by_user_id) REFERENCES users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fragrance_created_by ON fragrance(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_fragrance_visibility ON fragrance(visibility);
