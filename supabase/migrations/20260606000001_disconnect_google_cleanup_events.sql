-- When disconnecting Google Calendar, also remove all events that were
-- imported from Google (identified by having a google_event_id).
CREATE OR REPLACE FUNCTION disconnect_google()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM calendar_events
  WHERE user_id = auth.uid()
    AND google_event_id IS NOT NULL;

  DELETE FROM google_oauth_tokens
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION disconnect_google() TO authenticated;
