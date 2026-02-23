CREATE TABLE IF NOT EXISTS note_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES note_dictionary(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  merged_into_note_id UUID NULL REFERENCES note_dictionary(id) ON DELETE SET NULL,
  resolution_note TEXT,
  resolved_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_note_report_status
    CHECK (status IN ('OPEN', 'RESOLVED_DISMISSED', 'RESOLVED_MERGED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_note_report_open_per_user_note
  ON note_report (note_id, reported_by_user_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_note_report_status_created
  ON note_report (status, created_at DESC);
