CREATE TABLE IF NOT EXISTS fragrance_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragrance_id UUID NOT NULL REFERENCES fragrance(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution_note TEXT,
  resolved_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_fragrance_report_status
    CHECK (status IN ('OPEN', 'RESOLVED_DISMISSED', 'RESOLVED_DELETED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fragrance_report_open_per_user_fragrance
  ON fragrance_report (fragrance_id, reported_by_user_id)
  WHERE status = 'OPEN';

CREATE INDEX IF NOT EXISTS idx_fragrance_report_status_created
  ON fragrance_report (status, created_at DESC);
