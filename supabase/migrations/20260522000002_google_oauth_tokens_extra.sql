alter table google_oauth_tokens
  add column if not exists last_synced_at timestamptz;
