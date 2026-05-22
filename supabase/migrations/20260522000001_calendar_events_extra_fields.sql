alter table calendar_events
  add column if not exists location text,
  add column if not exists recurrence_rule text,
  add column if not exists recurrence_parent_id uuid references calendar_events(id) on delete cascade,
  add column if not exists google_event_id text unique;

create index if not exists calendar_events_google_event_id_idx on calendar_events(google_event_id);
create index if not exists calendar_events_recurrence_parent_idx on calendar_events(recurrence_parent_id);
