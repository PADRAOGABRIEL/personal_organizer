-- Add user_id to google_oauth_tokens for multi-user support
alter table google_oauth_tokens add column if not exists user_id uuid references auth.users(id) on delete cascade unique;

alter table google_oauth_tokens enable row level security;

create policy "google_tokens_select" on google_oauth_tokens for select using (auth.uid() = user_id);
create policy "google_tokens_insert" on google_oauth_tokens for insert with check (auth.uid() = user_id);
create policy "google_tokens_update" on google_oauth_tokens for update using (auth.uid() = user_id);
create policy "google_tokens_delete" on google_oauth_tokens for delete using (auth.uid() = user_id);
