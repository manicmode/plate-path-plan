-- 0) Minute-key function FIRST
create or replace function public.calculate_minute_key(ts timestamptz)
returns bigint language sql immutable strict as $$
  select floor(extract(epoch from date_trunc('minute', ts)) / 60)::bigint
$$;

-- 1) Generic trigger to populate minute_key from created_at
create or replace function public.set_minute_key_from_created_at()
returns trigger language plpgsql as $$
begin
  if new.created_at is null then new.created_at := now(); end if;
  if new.minute_key is null then
    new.minute_key := calculate_minute_key(new.created_at);
  end if;
  return new;
end$$;

-- 2) HYDRATION: ensure minute_key, backfill, trigger, index
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='hydration_logs') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='hydration_logs' and column_name='minute_key'
    ) then
      alter table public.hydration_logs add column minute_key bigint;
      update public.hydration_logs
         set minute_key = calculate_minute_key(coalesce(created_at, now()))
       where minute_key is null;
      alter table public.hydration_logs alter column minute_key set not null;
    end if;

    drop trigger if exists hydration_logs_minute_key_trigger on public.hydration_logs;
    create trigger hydration_logs_minute_key_trigger
      before insert on public.hydration_logs
      for each row execute function public.set_minute_key_from_created_at();

    create index if not exists hydration_logs_user_minute
      on public.hydration_logs(user_id, minute_key desc);
  end if;
end $$;

-- 3) FOOD: create table if missing; ensure trigger/index
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  calories integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  minute_key bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists food_logs_minute_key_trigger on public.food_logs;
create trigger food_logs_minute_key_trigger
  before insert on public.food_logs
  for each row execute function public.set_minute_key_from_created_at();

create index if not exists food_logs_user_minute
  on public.food_logs(user_id, minute_key desc);

-- 4) SUPPLEMENTS: create table if missing; ensure trigger/index
create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  dose numeric not null,
  unit text not null,
  minute_key bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists supplement_logs_minute_key_trigger on public.supplement_logs;
create trigger supplement_logs_minute_key_trigger
  before insert on public.supplement_logs
  for each row execute function public.set_minute_key_from_created_at();

create index if not exists supplement_logs_user_minute
  on public.supplement_logs(user_id, minute_key desc);

-- 5) Idempotency indexes (only on correct columns)
create unique index if not exists food_logs_dedupe
  on public.food_logs(user_id, minute_key, name, coalesce(calories,0));

drop index if exists supplement_logs_idempotent;
create unique index if not exists supplement_logs_dedupe
  on public.supplement_logs(user_id, minute_key, name, dose, unit);

-- 6) Goals / Reminders / Audit (tables + RLS)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  domain text not null,
  metric text not null,
  target numeric not null,
  unit text not null,
  timeframe text not null,
  active boolean not null default true,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists goals_active_unique
  on public.goals(user_id, domain, metric, timeframe) where active = true;

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  schedule jsonb not null,
  timezone text not null,
  channel text not null default 'app',
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminder_runs (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null,
  user_id uuid not null,
  scheduled_for timestamptz not null,
  delivered boolean not null default false,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_action_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  correlation_id text not null,
  action_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique (user_id, correlation_id)
);

-- A) Reminders need a scheduling cursor for workers
alter table public.reminders
  add column if not exists next_run_at timestamptz;
create index if not exists reminders_user_next
  on public.reminders(user_id, active, next_run_at);

-- Optional bootstrap so the scheduler picks up existing active reminders
update public.reminders
   set next_run_at = coalesce(next_run_at, now())
 where active = true;

-- B) Voice audit: keep flexibility if code expects these fields
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='voice_action_audit' and column_name='succeeded'
  ) then
    alter table public.voice_action_audit
      add column succeeded boolean not null default true,
      add column error_message text;
  end if;
end $$;

-- Fix 1) Reminders: keep schedule as RRULE text
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='reminders' and column_name='schedule'
      and data_type='jsonb'
  ) then
    alter table public.reminders
      alter column schedule type text using schedule::text;
  end if;
end $$;

-- Fix 2) Hydration payload → column name guard
do $$ begin
  if exists (select 1 from information_schema.tables where table_name='hydration_logs')
     and not exists (
       select 1 from information_schema.columns
       where table_name='hydration_logs' and column_name='volume'
     )
  then
    alter table public.hydration_logs add column volume numeric;
  end if;
end $$;

-- 7) RLS (enable + owner policies)
do $$ begin
  perform 1;
  -- enable
  alter table if exists public.hydration_logs enable row level security;
  alter table public.food_logs enable row level security;
  alter table public.supplement_logs enable row level security;
  alter table public.goals enable row level security;
  alter table public.reminders enable row level security;
  alter table public.reminder_runs enable row level security;
  alter table public.voice_action_audit enable row level security;

  -- generic owner rw + select (idempotent)
  begin
    create policy hydration_owner_rw on public.hydration_logs for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy hydration_owner_select on public.hydration_logs for select
      using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy food_logs_owner on public.food_logs for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy food_logs_owner_select on public.food_logs for select
      using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy supplement_logs_owner on public.supplement_logs for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy supplement_logs_owner_select on public.supplement_logs for select
      using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy goals_owner_rw on public.goals for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy reminders_owner_rw on public.reminders for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy reminder_runs_owner_rw on public.reminder_runs for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy voice_audit_owner_rw on public.voice_action_audit for all
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;

-- 8) Touch-updated_at trigger (optional but nice to keep fresh)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;

drop trigger if exists food_logs_touch_updated_at on public.food_logs;
create trigger food_logs_touch_updated_at
before update on public.food_logs for each row execute function public.touch_updated_at();

drop trigger if exists supplement_logs_touch_updated_at on public.supplement_logs;
create trigger supplement_logs_touch_updated_at
before update on public.supplement_logs for each row execute function public.touch_updated_at();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before update on public.goals for each row execute function public.touch_updated_at();

drop trigger if exists reminders_touch_updated_at on public.reminders;
create trigger reminders_touch_updated_at
before update on public.reminders for each row execute function public.touch_updated_at();