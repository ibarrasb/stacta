DELETE FROM user_collection_item
WHERE fragrance_external_id ~* '^f_[0-9a-f-]+_[0-9]+$';
