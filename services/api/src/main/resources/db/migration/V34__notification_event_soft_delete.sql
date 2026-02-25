ALTER TABLE notification_event
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_notification_event_recipient_active_created
  ON notification_event(recipient_user_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_event_deleted_at
  ON notification_event(deleted_at)
  WHERE deleted_at IS NOT NULL;
