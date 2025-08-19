-- Add columns to schedule nudges
alter table public.user_habit
  add column if not exists next_due_at timestamptz,
  add column if not exists snooze_until timestamptz;

-- Compute next due time from schedule + reminder_at (corrected timezone handling)
create or replace function public.compute_next_due_at(
  p_start_date date,
  p_schedule jsonb,
  p_reminder_at time without time zone
) returns timestamptz
language plpgsql
as $$
declare
  v_now timestamptz := now();
  v_type text := coalesce(p_schedule->>'type','daily');
  v_days text[] := coalesce((select array_agg(x) from jsonb_array_elements_text(p_schedule->'days') x), array[]::text[]);
  v_today date := current_date;
  v_candidate timestamptz;
  v_dow text;
  v_i int := 0;
  function_dow text[] := array['sun','mon','tue','wed','thu','fri','sat'];
begin
  if p_reminder_at is null then
    return null;
  end if;

  -- daily
  if v_type = 'daily' or array_length(v_days,1) is null then
    v_candidate := (v_today::timestamp + p_reminder_at)::timestamptz;
    if v_candidate <= v_now then
      v_candidate := ((v_today + 1)::timestamp + p_reminder_at)::timestamptz;
    end if;
    return v_candidate;
  end if;

  -- weekly
  v_candidate := (v_today::timestamp + p_reminder_at)::timestamptz;
  while v_i < 8 loop
    v_dow := function_dow[extract(dow from v_candidate)::int + 1];
    if v_candidate > v_now and v_dow = any(v_days) then
      return v_candidate;
    end if;
    v_candidate := (((v_candidate::date + 1)::timestamp) + p_reminder_at)::timestamptz;
    v_i := v_i + 1;
  end loop;

  return ((v_today + 1)::timestamp + p_reminder_at)::timestamptz;
end;
$$;

-- Keep next_due_at updated on insert/update of schedule/reminder/status
create or replace function public.tg_set_next_due_at()
returns trigger language plpgsql as $$
begin
  if new.status <> 'active' then
    new.next_due_at := null;
  else
    new.next_due_at := public.compute_next_due_at(new.start_date, new.schedule, new.reminder_at);
  end if;
  return new;
end $$;

drop trigger if exists t_set_next_due_at_ins on public.user_habit;
create trigger t_set_next_due_at_ins
before insert on public.user_habit
for each row execute function public.tg_set_next_due_at();

drop trigger if exists t_set_next_due_at_upd on public.user_habit;
create trigger t_set_next_due_at_upd
before update of schedule, reminder_at, status on public.user_habit
for each row execute function public.tg_set_next_due_at();

-- RPC: due soon items (default: now() ± window)
create or replace function public.rpc_get_due_habits(
  p_before_minutes int default 10,
  p_after_minutes  int default 30
) returns table(
  user_habit_id uuid,
  slug text,
  name text,
  domain text,
  summary text,
  next_due_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select uh.id, uh.slug, ht.name, ht.domain, ht.summary, uh.next_due_at
  from public.user_habit uh
  join public.habit_template ht on ht.slug = uh.slug
  where uh.user_id = auth.uid()
    and uh.status = 'active'
    and uh.reminder_at is not null
    and uh.next_due_at between (now() - make_interval(mins => p_before_minutes))
                          and     (now() + make_interval(mins => p_after_minutes))
    and (uh.snooze_until is null or uh.snooze_until < now())
  order by uh.next_due_at asc, ht.name asc;
$$;

-- RPC: snooze current nudge (default 10m)
create or replace function public.rpc_snooze_habit(
  p_user_habit_id uuid,
  p_minutes int default 10
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.user_habit
     set snooze_until = now() + make_interval(mins => greatest(p_minutes,1))
   where id = p_user_habit_id
     and user_id = auth.uid()
     and status = 'active';
end;
$$;

-- Patch: after a successful log, bump next_due_at to next occurrence
create or replace function public.rpc_log_habit(
  p_slug text,
  p_amount numeric default null,
  p_duration_min numeric default null,
  p_completed boolean default true,
  p_meta jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.user_habit
    where user_id = auth.uid() and slug = p_slug and status = 'active'
  ) then
    raise exception 'habit % not active for user', p_slug;
  end if;

  insert into public.habit_completion_log(user_id, slug, amount, duration_min, completed, meta)
  values (auth.uid(), p_slug, p_amount, p_duration_min, coalesce(p_completed,true), p_meta)
  returning id into v_id;

  -- bump next_due_at for this user's habit
  update public.user_habit uh
     set next_due_at = public.compute_next_due_at(uh.start_date, uh.schedule, uh.reminder_at),
         snooze_until = null
   where uh.user_id = auth.uid() and uh.slug = p_slug and uh.status = 'active';

  return v_id;
end;
$$;

-- Performance indexes for the bell
create index if not exists uh_due_idx
  on public.user_habit(user_id, status, next_due_at)
  where status = 'active' and next_due_at is not null;

create index if not exists uh_snooze_idx
  on public.user_habit(user_id, snooze_until)
  where snooze_until is not null;

-- One-time backfill for existing rows
update public.user_habit uh
set next_due_at = public.compute_next_due_at(uh.start_date, uh.schedule, uh.reminder_at)
where uh.status = 'active' and uh.reminder_at is not null;

-- Grant permissions
revoke all on function public.rpc_get_due_habits(int,int) from public, anon;
revoke all on function public.rpc_snooze_habit(uuid,int)  from public, anon;
grant execute on function public.rpc_get_due_habits(int,int) to authenticated;
grant execute on function public.rpc_snooze_habit(uuid,int)  to authenticated;