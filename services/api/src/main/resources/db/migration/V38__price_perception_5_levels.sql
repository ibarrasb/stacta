ALTER TABLE community_fragrance_vote
  DROP CONSTRAINT IF EXISTS chk_community_vote_price;

ALTER TABLE community_fragrance_vote
  ADD CONSTRAINT chk_community_vote_price CHECK (
    price_perception IS NULL OR price_perception IN (
      'VERY_OVERPRICED',
      'A_BIT_OVERPRICED',
      'FAIR',
      'GOOD_VALUE',
      'EXCELLENT_VALUE',
      'OVERPRICED',
      'GREAT_VALUE'
    )
  );

ALTER TABLE fragella_fragrance_vote
  DROP CONSTRAINT IF EXISTS chk_fragella_vote_price;

ALTER TABLE fragella_fragrance_vote
  ADD CONSTRAINT chk_fragella_vote_price CHECK (
    price_perception IS NULL OR price_perception IN (
      'VERY_OVERPRICED',
      'A_BIT_OVERPRICED',
      'FAIR',
      'GOOD_VALUE',
      'EXCELLENT_VALUE',
      'OVERPRICED',
      'GREAT_VALUE'
    )
  );
