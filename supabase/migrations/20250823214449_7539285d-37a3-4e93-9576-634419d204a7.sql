-- 0) Minute-key (floor to minute)
create or replace function public.calculate_minute_key(ts timestamptz)
returns bigint language sql immutable strict as $$
  select floor(extract(epoch from date_trunc('minute', ts)) / 60)::bigint
$$;

-- 1) Generic trigger: minute_key from created_at
create or replace function public.set_minute_key_from_created_at()
returns trigger language plpgsql as $$
begin
  if new.created_at is null then new.created_at := now(); end if;
  if new.minute_key is null then
    new.minute_key := public.calculate_minute_key(new.created_at);
  end if;
  return new;
end$$;

-- 2) HYDRATION
create table if not exists public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  volume numeric,               -- in ounces; agent maps amount_oz→volume
  name text default 'water',
  minute_key bigint,            -- nullable until trigger is set
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists hydration_logs_minute_key_trigger on public.hydration_logs;
create trigger hydration_logs_minute_key_trigger
  before insert on public.hydration_logs
  for each row execute function public.set_minute_key_from_created_at();

-- Backfill & then enforce NOT NULL
update public.hydration_logs
  set minute_key = public.calculate_minute_key(created_at)
  where minute_key is null;
alter table public.hydration_logs alter column minute_key set not null;

create index if not exists hydration_logs_user_minute
  on public.hydration_logs(user_id, minute_key desc);
-- Optional dedupe (safer): allow multiple entries in the same minute if volume differs
drop index if exists hydration_logs_user_minute_unique;
create unique index if not exists hydration_logs_dedupe
  on public.hydration_logs(user_id, minute_key, coalesce(volume,0));

-- 3) FOOD (align column names used by the loader)
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,           -- NOT food_name
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  minute_key bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists food_logs_minute_key_trigger on public.food_logs;
create trigger food_logs_minute_key_trigger
  before insert on public.food_logs
  for each row execute function public.set_minute_key_from_created_at();

update public.food_logs set minute_key = public.calculate_minute_key(created_at) where minute_key is null;
alter table public.food_logs alter column minute_key set not null;

create index if not exists food_logs_user_minute
  on public.food_logs(user_id, minute_key desc);

create unique index if not exists food_logs_dedupe
  on public.food_logs(user_id, minute_key, name, coalesce(calories,0));

-- 4) SUPPLEMENTS (align names & types)
create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  dose numeric not null,        -- NOT dosage text
  unit text not null,
  minute_key bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists supplement_logs_minute_key_trigger on public.supplement_logs;
create trigger supplement_logs_minute_key_trigger
  before insert on public.supplement_logs
  for each row execute function public.set_minute_key_from_created_at();

update public.supplement_logs set minute_key = public.calculate_minute_key(created_at) where minute_key is null;
alter table public.supplement_logs alter column minute_key set not null;

create index if not exists supplement_logs_user_minute
  on public.supplement_logs(user_id, minute_key desc);

create unique index if not exists supplement_logs_dedupe
  on public.supplement_logs(user_id, minute_key, name, dose, unit);

-- 5) GOALS
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

-- 6) REMINDERS (schedule is TEXT; add next_run_at cursor)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  schedule text not null,       -- RRULE TEXT
  timezone text not null,
  channel text not null default 'app',
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- convert old jsonb schedule if present
do $$ begin
  if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='reminders'
                 and column_name='schedule' and data_type='jsonb') then
    alter table public.reminders
      alter column schedule type text using trim(both '"' from schedule::text);
  end if;
end $$;
create index if not exists reminders_user_next
  on public.reminders(user_id, active, next_run_at);

-- 7) VOICE AUDIT (correlation_id must be TEXT)
create table if not exists public.voice_action_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  correlation_id text not null,       -- TEXT (not uuid)
  tool_name text not null,
  args jsonb not null default '{}'::jsonb,
  succeeded boolean not null default true,
  error_message text,
  created_at timestamptz not null default now(),
  unique (user_id, correlation_id)
);

-- 8) Touch-updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;

drop trigger if exists hydration_logs_touch_updated_at on public.hydration_logs;
create trigger hydration_logs_touch_updated_at
before update on public.hydration_logs for each row execute function public.touch_updated_at();

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

-- 9) RLS (owner read/write)
alter table public.hydration_logs enable row level security;
alter table public.food_logs enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.goals enable row level security;
alter table public.reminders enable row level security;
alter table public.voice_action_audit enable row level security;

do $$ begin
  -- hydration
  begin create policy hydration_rw on public.hydration_logs
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  -- food
  begin create policy food_rw on public.food_logs
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  -- supplements
  begin create policy supplements_rw on public.supplement_logs
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  -- goals
  begin create policy goals_rw on public.goals
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  -- reminders
  begin create policy reminders_rw on public.reminders
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  -- voice audit
  begin create policy voice_audit_rw on public.voice_action_audit
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;