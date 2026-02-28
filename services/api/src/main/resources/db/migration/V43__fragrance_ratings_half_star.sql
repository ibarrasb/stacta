ALTER TABLE fragrance_rating
  DROP CONSTRAINT IF EXISTS chk_fragrance_rating_value;

ALTER TABLE fragrance_rating
  ALTER COLUMN rating TYPE NUMERIC(2,1) USING rating::numeric(2,1);

ALTER TABLE fragrance_rating
  ADD CONSTRAINT chk_fragrance_rating_value
  CHECK (rating >= 1.0 AND rating <= 5.0 AND (rating * 2.0) = trunc(rating * 2.0));
