-- Fix legacy token row: assign user_id based on email match in auth.users
UPDATE google_oauth_tokens
SET user_id = au.id
FROM auth.users au
WHERE google_oauth_tokens.user_id IS NULL
  AND au.email = google_oauth_tokens.connected_email;

-- Update get_google_connection_status to return NULL when not connected
-- (so maybeSingle() returns null and the frontend correctly detects disconnected)
-- and return proper field names that the frontend TypeScript types expect
CREATE OR REPLACE FUNCTION get_google_connection_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tok google_oauth_tokens%rowtype;
BEGIN
  SELECT * INTO tok
  FROM google_oauth_tokens
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'connected_email', tok.connected_email,
    'calendar_id',     tok.calendar_id,
    'updated_at',      tok.updated_at,
    'last_synced_at',  NULL
  );
END;
$$;

-- Create a SECURITY DEFINER disconnect function so the frontend
-- doesn't need direct table access (avoids RLS edge cases)
CREATE OR REPLACE FUNCTION disconnect_google()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM google_oauth_tokens
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION disconnect_google() TO authenticated;
