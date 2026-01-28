CREATE TABLE IF NOT EXISTS fragrance_note (
  fragrance_id UUID NOT NULL,
  note_id UUID NOT NULL,
  note_category VARCHAR(20) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (fragrance_id, note_id, note_category),
  CONSTRAINT fk_fragrance_note_fragrance
    FOREIGN KEY (fragrance_id) REFERENCES fragrance(id) ON DELETE CASCADE,
  CONSTRAINT fk_fragrance_note_note
    FOREIGN KEY (note_id) REFERENCES note_dictionary(id),
  CONSTRAINT chk_note_category CHECK (note_category IN ('TOP', 'MIDDLE', 'BASE'))
);

CREATE INDEX IF NOT EXISTS idx_fragrance_note_fragrance ON fragrance_note(fragrance_id);
CREATE INDEX IF NOT EXISTS idx_fragrance_note_note ON fragrance_note(note_id);
