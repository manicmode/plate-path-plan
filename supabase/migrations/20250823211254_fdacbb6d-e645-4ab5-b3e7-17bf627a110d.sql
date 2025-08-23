-- 0) Utility: minute key (minutes since epoch, rounded down)
create or replace function calculate_minute_key(ts timestamptz)
returns bigint
language sql
immutable
strict
as $$
  select floor(extract(epoch from date_trunc('minute', ts)) / 60)::bigint
$$;

-- 1) Base tables (idempotent)
create table if not exists food_logs (
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

create table if not exists supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  dose numeric not null,
  unit text not null,
  minute_key bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  domain text not null,
  metric text not null,
  target numeric not null,
  unit text not null,
  timeframe text not null,
  start_at timestamptz not null default now(),
  end_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  schedule text not null,
  timezone text not null,
  channel text not null default 'push',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminder_runs (
  id bigint generated always as identity primary key,
  reminder_id uuid not null,
  user_id uuid not null,
  run_at timestamptz not null default now(),
  delivered boolean not null,
  error_message text
);

create table if not exists voice_action_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  correlation_id text,
  action text not null,
  request_args jsonb not null default '{}'::jsonb,
  succeeded boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

-- 2) Touch trigger (keeps updated_at fresh)
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists food_logs_touch_updated_at on food_logs;
create trigger food_logs_touch_updated_at
before update on food_logs
for each row execute function touch_updated_at();

drop trigger if exists supplement_logs_touch_updated_at on supplement_logs;
create trigger supplement_logs_touch_updated_at
before update on supplement_logs
for each row execute function touch_updated_at();

drop trigger if exists goals_touch_updated_at on goals;
create trigger goals_touch_updated_at
before update on goals
for each row execute function touch_updated_at();

drop trigger if exists reminders_touch_updated_at on reminders;
create trigger reminders_touch_updated_at
before update on reminders
for each row execute function touch_updated_at();

-- 3) Minute-key triggers (populate minute_key from created_at)
create or replace function set_food_minute_key()
returns trigger language plpgsql as $$
begin
  if new.created_at is null then new.created_at := now(); end if;
  new.minute_key := calculate_minute_key(new.created_at);
  return new;
end$$;

create or replace function set_supplement_minute_key()
returns trigger language plpgsql as $$
begin
  if new.created_at is null then new.created_at := now(); end if;
  new.minute_key := calculate_minute_key(new.created_at);
  return new;
end$$;

drop trigger if exists food_logs_minute_key_trigger on food_logs;
create trigger food_logs_minute_key_trigger
before insert on food_logs
for each row execute function set_food_minute_key();

drop trigger if exists supplement_logs_minute_key_trigger on supplement_logs;
create trigger supplement_logs_minute_key_trigger
before insert on supplement_logs
for each row execute function set_supplement_minute_key();

-- (Optional, if hydration_logs exists, mirror index & ensure minute_key function is present)
do $$ begin
  if exists (select 1 from information_schema.tables where table_name='hydration_logs') then
    create index if not exists hydration_logs_user_minute
      on hydration_logs(user_id, minute_key desc);
  end if;
end $$;

-- 4) Idempotency & query-path indexes
create unique index if not exists food_logs_dedupe
  on food_logs(user_id, minute_key, name, coalesce(calories,0));

drop index if exists supplement_logs_dedupe;
create unique index if not exists supplement_logs_dedupe
  on supplement_logs(user_id, minute_key, name, dose, unit);

create index if not exists food_logs_user_minute
  on food_logs(user_id, minute_key desc);

create index if not exists supplement_logs_user_minute
  on supplement_logs(user_id, minute_key desc);

create unique index if not exists goals_active_unique
  on goals(user_id, domain, metric, timeframe) where active = true;

create index if not exists reminders_user_next
  on reminders(user_id, status, next_run_at);

create unique index if not exists voice_action_audit_correlation
  on voice_action_audit(user_id, correlation_id) where correlation_id is not null;

-- 5) RLS (write + read)
alter table food_logs enable row level security;
alter table supplement_logs enable row level security;
alter table goals enable row level security;
alter table reminders enable row level security;
alter table reminder_runs enable row level security;
alter table voice_action_audit enable row level security;

do $$ begin
  -- writes/reads for owners
  begin
    create policy food_logs_owner on food_logs
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy food_logs_owner_select on food_logs
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy supplement_logs_owner on supplement_logs
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy supplement_logs_owner_select on supplement_logs
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy goals_owner on goals
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy goals_owner_select on goals
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy reminders_owner on reminders
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
  begin
    create policy reminders_owner_select on reminders
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy reminder_runs_owner on reminder_runs
      using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy voice_action_audit_owner on voice_action_audit
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;