CREATE TABLE IF NOT EXISTS note_dictionary (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  image_url TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT note_dictionary_normalized_uq UNIQUE (normalized_name)
);

CREATE INDEX IF NOT EXISTS idx_note_dictionary_name ON note_dictionary(name);
CREATE INDEX IF NOT EXISTS idx_note_dictionary_usage ON note_dictionary(usage_count);
