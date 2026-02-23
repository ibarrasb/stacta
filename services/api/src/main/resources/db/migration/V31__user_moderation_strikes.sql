CREATE TABLE IF NOT EXISTS user_moderation_strike (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_report_id UUID NULL REFERENCES note_report(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_moderation_strike_points CHECK (points > 0 AND points <= 10)
);

CREATE INDEX IF NOT EXISTS idx_user_moderation_strike_user_created
  ON user_moderation_strike (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_moderation_strike_report
  ON user_moderation_strike (note_report_id);
