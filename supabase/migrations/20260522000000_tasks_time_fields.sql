alter table tasks
  add column if not exists due_time time,
  add column if not exists duration_minutes integer check (duration_minutes > 0),
  add column if not exists recurrence_rule text,
  add column if not exists google_event_id text unique;

create index if not exists tasks_google_event_id_idx on tasks(google_event_id);
