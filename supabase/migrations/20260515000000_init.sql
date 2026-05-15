create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  color       text not null default '#6366f1',
  status      text not null default 'active'
                check (status in ('active', 'archived')),
  created_at  timestamptz default now()
);

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'todo'
                check (status in ('todo', 'in_progress', 'done')),
  priority    text not null default 'medium'
                check (priority in ('low', 'medium', 'high')),
  due_date    date,
  project_id  uuid references projects(id) on delete set null,
  created_at  timestamptz default now()
);

create table calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  start_time  timestamptz not null,
  end_time    timestamptz,
  all_day     boolean not null default false,
  project_id  uuid references projects(id) on delete set null,
  created_at  timestamptz default now()
);

-- Index for fast task lookups by project
create index tasks_project_id_idx on tasks(project_id);
-- Index for calendar range queries
create index tasks_due_date_idx on tasks(due_date);
create index calendar_events_start_time_idx on calendar_events(start_time);
create index calendar_events_project_id_idx on calendar_events(project_id);
