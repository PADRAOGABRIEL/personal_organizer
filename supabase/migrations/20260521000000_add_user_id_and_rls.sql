-- Add user_id to main tables (nullable initially to allow data migration)
-- DEFAULT auth.uid() means inserts without explicit user_id automatically use the current user
alter table projects add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table tasks add column user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table calendar_events add column user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Re-enable RLS
alter table projects enable row level security;
alter table tasks enable row level security;
alter table calendar_events enable row level security;

-- Projects: read/update/delete own rows
create policy "projects_select" on projects for select using (auth.uid() = user_id);
create policy "projects_insert" on projects for insert with check (auth.uid() = user_id);
create policy "projects_update" on projects for update using (auth.uid() = user_id);
create policy "projects_delete" on projects for delete using (auth.uid() = user_id);

-- Tasks: read/update/delete own rows
create policy "tasks_select" on tasks for select using (auth.uid() = user_id);
create policy "tasks_insert" on tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update" on tasks for update using (auth.uid() = user_id);
create policy "tasks_delete" on tasks for delete using (auth.uid() = user_id);

-- Calendar events: read/update/delete own rows
create policy "calendar_events_select" on calendar_events for select using (auth.uid() = user_id);
create policy "calendar_events_insert" on calendar_events for insert with check (auth.uid() = user_id);
create policy "calendar_events_update" on calendar_events for update using (auth.uid() = user_id);
create policy "calendar_events_delete" on calendar_events for delete using (auth.uid() = user_id);
