ALTER TABLE activity_event
  DROP CONSTRAINT IF EXISTS activity_event_type_check;

ALTER TABLE activity_event
  ADD CONSTRAINT activity_event_type_check
  CHECK (type IN (
    'USER_FOLLOWED_USER',
    'REVIEW_POSTED',
    'COLLECTION_ITEM_ADDED',
    'WISHLIST_ITEM_ADDED',
    'REVIEW_REPOSTED',
    'SCENT_POSTED'
  ));
