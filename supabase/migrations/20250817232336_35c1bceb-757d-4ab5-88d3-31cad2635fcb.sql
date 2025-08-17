-- =========================================================
-- HABIT CENTRAL — FULL SCHEMA + POLISH (one-shot, idempotent)
-- =========================================================

-- 🔧 Prereqs
create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
do $$ begin
  create type habit_goal_type as enum ('bool','count','duration');
exception when duplicate_object then null; end $$;

do $$ begin
  create type habit_status as enum ('active','paused','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reminder_kind as enum ('time','event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type nudge_type as enum ('reminder','encourage','recovery','celebration');
exception when duplicate_object then null; end $$;

-- ---------- TABLES ----------
create table if not exists public.habit (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text,
  template_id   uuid,
  goal_type     habit_goal_type not null,
  goal_target   numeric,                      -- null for boolean habits
  min_viable    boolean not null default true,
  start_date    date not null default current_date,
  end_date      date,
  status        habit_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at trigger (shared)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists habit_updated_at on public.habit;
create trigger habit_updated_at
before update on public.habit
for each row execute procedure public.set_updated_at();

create table if not exists public.schedule_rule (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.habit(id) on delete cascade,
  user_id       uuid not null,
  -- type + params let us support daily, weekly, interval, X-per-week, etc.
  type          text not null check (type in ('daily','weekly','interval','times_per_week')),
  params        jsonb not null default '{}'::jsonb,   -- e.g. {"dow":[1,3,5]} or {"interval_days":2}
  time_windows  jsonb[] default null,                 -- e.g. [{'start':'07:00','end':'10:00'}]
  tz            text not null default 'UTC',
  created_at    timestamptz not null default now()
);

create table if not exists public.habit_log (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.habit(id) on delete cascade,
  user_id       uuid not null,
  ts            timestamptz not null,
  value         numeric,
  partial       numeric check (partial is null or (partial >= 0 and partial <= 1)),
  note          text,
  source        text not null default 'app',          -- app | watch | api | healthkit
  client_log_id uuid not null,                        -- idempotency key from client
  created_at    timestamptz not null default now(),
  unique (user_id, client_log_id)
);

create index if not exists habit_log_habit_ts_idx on public.habit_log (habit_id, ts desc);

create table if not exists public.streak_state (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null unique references public.habit(id) on delete cascade,
  user_id       uuid not null,
  current_len   int not null default 0,
  longest_len   int not null default 0,
  frozen_until  date,
  repair_tokens int not null default 0,
  last_log_date date,
  updated_at    timestamptz not null default now()
);

create table if not exists public.habit_strength (
  habit_id      uuid primary key references public.habit(id) on delete cascade,
  score         int not null default 0 check (score between 0 and 100),
  last_recalc_at timestamptz
);

create table if not exists public.reminder (
  id            uuid primary key default gen_random_uuid(),
  habit_id      uuid not null references public.habit(id) on delete cascade,
  user_id       uuid not null,
  kind          reminder_kind not null,
  payload       jsonb not null,                       -- time payload or event descriptor
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.nudge_event (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  habit_id      uuid references public.habit(id) on delete set null,
  type          nudge_type not null,
  trigger       text not null,                        -- e.g. 'time_window', 'drop_off', 'streak_milestone'
  scheduled_at  timestamptz not null,
  sent_at       timestamptz,
  result        text,                                 -- opened | completed | dismissed
  created_at    timestamptz not null default now()
);

-- ---------- GUARD: child rows must match parent user_id ----------
create or replace function public.enforce_child_user_matches_parent()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare parent_user uuid;
begin
  select user_id into parent_user from public.habit where id = new.habit_id;
  if parent_user is null then
    raise exception 'Habit % not found for child row', new.habit_id;
  end if;
  if new.user_id is distinct from parent_user then
    raise exception 'User mismatch: child row user_id must equal parent habit''s user_id';
  end if;
  return new;
end$$;

drop trigger if exists sr_user_guard on public.schedule_rule;
create trigger sr_user_guard  before insert or update on public.schedule_rule
for each row execute procedure public.enforce_child_user_matches_parent();

drop trigger if exists log_user_guard on public.habit_log;
create trigger log_user_guard before insert or update on public.habit_log
for each row execute procedure public.enforce_child_user_matches_parent();

drop trigger if exists streak_user_guard on public.streak_state;
create trigger streak_user_guard before insert or update on public.streak_state
for each row execute procedure public.enforce_child_user_matches_parent();

drop trigger if exists reminder_user_guard on public.reminder;
create trigger reminder_user_guard before insert or update on public.reminder
for each row execute procedure public.enforce_child_user_matches_parent();

-- ---------- POLISH #2: auto-update timestamp on streak_state ----------
drop trigger if exists streak_state_updated_at on public.streak_state;
create trigger streak_state_updated_at
before update on public.streak_state
for each row execute procedure public.set_updated_at();

-- ---------- RLS: simple, non-recursive, per-user ----------
alter table public.habit           enable row level security;
alter table public.schedule_rule   enable row level security;
alter table public.habit_log       enable row level security;
alter table public.streak_state    enable row level security;
alter table public.habit_strength  enable row level security;
alter table public.reminder        enable row level security;
alter table public.nudge_event     enable row level security;

-- habit
drop policy if exists habit_sel on public.habit;
drop policy if exists habit_ins on public.habit;
drop policy if exists habit_upd on public.habit;
drop policy if exists habit_del on public.habit;

create policy habit_sel on public.habit
  for select using (user_id = auth.uid());
create policy habit_ins on public.habit
  for insert with check (user_id = auth.uid());
create policy habit_upd on public.habit
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy habit_del on public.habit
  for delete using (user_id = auth.uid());

-- children (all carry user_id so RLS stays non-recursive)
drop policy if exists schedule_rule_rw on public.schedule_rule;
create policy schedule_rule_rw on public.schedule_rule
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists habit_log_rw on public.habit_log;
create policy habit_log_rw on public.habit_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists streak_state_rw on public.streak_state;
create policy streak_state_rw on public.streak_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists habit_strength_rw on public.habit_strength;
create policy habit_strength_rw on public.habit_strength
  for all using (
    exists (select 1 from public.habit h where h.id = habit_strength.habit_id and h.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.habit h where h.id = habit_strength.habit_id and h.user_id = auth.uid())
  );

drop policy if exists reminder_rw on public.reminder;
create policy reminder_rw on public.reminder
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists nudge_event_rw on public.nudge_event;
create policy nudge_event_rw on public.nudge_event
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- POLISH #1: helpful indexes ----------
create index if not exists habit_user_status_idx   on public.habit (user_id, status);
create index if not exists schedule_rule_habit_idx on public.schedule_rule (habit_id);
create index if not exists streak_state_user_idx   on public.streak_state (user_id);
create index if not exists reminder_user_enabled_idx on public.reminder(user_id, enabled);
create index if not exists nudge_sched_idx         on public.nudge_event(user_id, scheduled_at);

-- ---------- POLISH #3: remove redundant composite unique if it exists ----------
-- We keep the one-to-one uniqueness via habit_id unique on streak_state.
drop index if exists public.streak_state_user_habit_uniq;