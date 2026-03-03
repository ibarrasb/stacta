CREATE TABLE IF NOT EXISTS review_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES activity_event(id) ON DELETE CASCADE,
  reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('OPEN', 'RESOLVED'))
);

CREATE INDEX IF NOT EXISTS idx_review_report_review_status
  ON review_report(review_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_review_report_open_by_user
  ON review_report(review_id, reported_by_user_id)
  WHERE status = 'OPEN';
