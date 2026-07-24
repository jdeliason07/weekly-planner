-- Week Machine — initial schema.
--
-- Single user in practice, but auth is not decorative: row-level security is
-- on for every table and every policy scopes rows to auth.uid().

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type block_type as enum ('anchor', 'sprint', 'open');
exception when duplicate_object then null; end $$;

do $$ begin
  create type week_status as enum ('draft', 'synced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sync_state as enum ('unsynced', 'synced', 'pending_delete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_role as enum ('user', 'assistant');
exception when duplicate_object then null; end $$;

-- areas ----------------------------------------------------------------------
create table if not exists areas (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  name                  text not null,
  default_type          block_type not null default 'anchor',
  rank                  int not null default 0,
  target_hours_per_week numeric(5,2) not null default 0,
  pattern               text not null,
  season_end_date       date,
  success_definition    text not null default '',
  archived_at           timestamptz
);
create index if not exists areas_user_idx on areas(user_id);

-- template_blocks ------------------------------------------------------------
create table if not exists template_blocks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  area_id      uuid not null references areas(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  label        text,
  type         block_type,               -- null inherits area default
  check (start_time < end_time)
);
create index if not exists template_blocks_user_idx on template_blocks(user_id);

-- week_plans -----------------------------------------------------------------
create table if not exists week_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  status          week_status not null default 'draft',
  unique (user_id, week_start_date)
);
create index if not exists week_plans_user_idx on week_plans(user_id);

-- planned_blocks -------------------------------------------------------------
create table if not exists planned_blocks (
  id            uuid primary key default gen_random_uuid(),
  week_plan_id  uuid not null references week_plans(id) on delete cascade,
  area_id       uuid not null references areas(id) on delete cascade,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  label         text,
  type          block_type not null,
  gcal_event_id text,
  sync_state    sync_state not null default 'unsynced',
  completed_at  timestamptz,
  check (start_time < end_time)
);
create index if not exists planned_blocks_week_idx on planned_blocks(week_plan_id);

-- chat_messages --------------------------------------------------------------
create table if not exists chat_messages (
  id              uuid primary key default gen_random_uuid(),
  week_plan_id    uuid not null references week_plans(id) on delete cascade,
  role            chat_role not null,
  content         text not null,
  actions_applied int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists chat_messages_week_idx on chat_messages(week_plan_id);

-- user_settings --------------------------------------------------------------
create table if not exists user_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  sleep_hours_per_night numeric(4,2) not null default 8,
  week_starts_on        int not null default 0 check (week_starts_on between 0 and 6),
  timezone              text not null default 'America/Denver'
);

-- Row-level security ---------------------------------------------------------
alter table areas           enable row level security;
alter table template_blocks enable row level security;
alter table week_plans      enable row level security;
alter table planned_blocks  enable row level security;
alter table chat_messages   enable row level security;
alter table user_settings   enable row level security;

-- Direct-ownership tables: user_id must equal auth.uid().
do $$
declare t text;
begin
  foreach t in array array['areas','template_blocks','week_plans'] loop
    execute format('drop policy if exists %I_owner on %I;', t, t);
    execute format($f$
      create policy %I_owner on %I
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t || '_owner', t);
  end loop;
end $$;

-- user_settings keyed by user_id.
drop policy if exists user_settings_owner on user_settings;
create policy user_settings_owner on user_settings
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- planned_blocks: owned via its week_plan.
drop policy if exists planned_blocks_owner on planned_blocks;
create policy planned_blocks_owner on planned_blocks
  using (exists (
    select 1 from week_plans w
    where w.id = planned_blocks.week_plan_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from week_plans w
    where w.id = planned_blocks.week_plan_id and w.user_id = auth.uid()
  ));

-- chat_messages: owned via its week_plan.
drop policy if exists chat_messages_owner on chat_messages;
create policy chat_messages_owner on chat_messages
  using (exists (
    select 1 from week_plans w
    where w.id = chat_messages.week_plan_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from week_plans w
    where w.id = chat_messages.week_plan_id and w.user_id = auth.uid()
  ));
