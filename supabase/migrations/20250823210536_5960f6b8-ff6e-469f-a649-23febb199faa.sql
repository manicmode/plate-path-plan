-- 0) Utility: minute key (minutes since epoch, rounded down)
create or replace function calculate_minute_key(ts timestamptz)
returns bigint
language sql
immutable
strict
as $$
  select floor(extract(epoch from date_trunc('minute', ts)) / 60)::bigint
$$;

-- 1) Ensure created_at exists and is used as the event time for logs
-- (Edge must set created_at := coalesce(args.when, now()))

-- 2) Auto-update updated_at columns
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

-- Add updated_at to tables that need it (if missing)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='food_logs' and column_name='updated_at'
  ) then
    alter table food_logs add column updated_at timestamptz not null default now();
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_name='supplement_logs' and column_name='updated_at'
  ) then
    alter table supplement_logs add column updated_at timestamptz not null default now();
  end if;
end $$;

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

-- 3) Minute-key triggers (safe re-create)
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

-- 4) Dedupe indexes (supplements include unit)
drop index if exists supplement_logs_dedupe;
create unique index if not exists supplement_logs_dedupe
  on supplement_logs(user_id, minute_key, name, dose, unit);

-- 5) Query-path indexes for day views
create index if not exists food_logs_user_minute
  on food_logs(user_id, minute_key desc);
create index if not exists supplement_logs_user_minute
  on supplement_logs(user_id, minute_key desc);

-- (Optional: if hydration_logs exists, mirror the index)
do $$ begin
  if exists (select 1 from information_schema.tables where table_name='hydration_logs') then
    create index if not exists hydration_logs_user_minute
      on hydration_logs(user_id, minute_key desc);
  end if;
end $$;

-- 6) Idempotency audit uniqueness (already proposed, keep it)
create unique index if not exists voice_action_audit_correlation
  on voice_action_audit(user_id, correlation_id) where correlation_id is not null;

-- 7) RLS: ensure SELECT is permitted to the owner (read paths)
-- (Your WITH CHECK already covers writes.)
do $$ begin
  begin
    create policy food_logs_owner_select on food_logs
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy supplement_logs_owner_select on supplement_logs
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy goals_owner_select on goals
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;

  begin
    create policy reminders_owner_select on reminders
      for select using (user_id = auth.uid());
  exception when duplicate_object then null; end;
end $$;