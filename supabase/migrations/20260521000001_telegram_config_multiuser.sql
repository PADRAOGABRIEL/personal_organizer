-- Recreate telegram_config as multi-user (drop singleton table)
drop table if exists telegram_config;

create table telegram_config (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null unique,
  chat_id      text not null,
  summary_hour int  not null default 20,
  session      jsonb,
  last_summary_date date
);

alter table telegram_config enable row level security;

create policy "telegram_config_select" on telegram_config for select using (auth.uid() = user_id);
create policy "telegram_config_insert" on telegram_config for insert with check (auth.uid() = user_id);
create policy "telegram_config_update" on telegram_config for update using (auth.uid() = user_id);
create policy "telegram_config_delete" on telegram_config for delete using (auth.uid() = user_id);
