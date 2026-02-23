ALTER TABLE notification_event
  DROP CONSTRAINT IF EXISTS notification_event_type_check;

ALTER TABLE notification_event
  ADD CONSTRAINT notification_event_type_check
  CHECK (type IN ('FOLLOWED_YOU', 'FOLLOWED_YOU_BACK', 'MODERATION_STRIKE'));
