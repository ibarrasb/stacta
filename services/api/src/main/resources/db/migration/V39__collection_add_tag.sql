ALTER TABLE user_collection_item
  ADD COLUMN IF NOT EXISTS collection_tag TEXT NULL;

ALTER TABLE activity_event
  ADD COLUMN IF NOT EXISTS collection_tag TEXT NULL;
