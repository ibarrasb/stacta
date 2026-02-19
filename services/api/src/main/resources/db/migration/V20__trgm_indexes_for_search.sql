CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_display_name_trgm
ON users USING gin (display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_note_dictionary_name_trgm
ON note_dictionary USING gin (name gin_trgm_ops);
