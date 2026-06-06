-- gcal_event_id: tracks the Google Calendar event ID for events
-- created IN the app and synced TO Google.
-- Separate from google_event_id which tracks events imported FROM Google.
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS gcal_event_id text;
