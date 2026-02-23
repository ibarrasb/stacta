CREATE TABLE IF NOT EXISTS user_custom_note_creation_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES note_dictionary(id) ON DELETE CASCADE,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_custom_note_creation_event_user_created
  ON user_custom_note_creation_event(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_custom_note_creation_event_user_name
  ON user_custom_note_creation_event(user_id, normalized_name);
