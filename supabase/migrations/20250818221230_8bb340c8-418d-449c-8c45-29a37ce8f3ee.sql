-- Foundations for user-chosen habits
create extension if not exists pgcrypto;

-- 1) USER HABITS (what the user has started)
create table if not exists public.user_habit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  slug text not null references public.habit_template(slug) on update cascade on delete restrict,
  status text not null default 'active' check (status in ('active','paused','completed')),
  start_date date not null default current_date,
  schedule jsonb not null default jsonb_build_object('type','daily'), -- {"type":"daily"} or {"type":"weekly","days":["mon","wed","fri"]}
  reminder_at time without time zone,
  target numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists uh_user_idx on public.user_habit(user_id);
create index if not exists uh_slug_idx on public.user_habit(slug);

alter table public.user_habit enable row level security;
drop policy if exists uh_owner_all on public.user_habit;
create policy uh_owner_all on public.user_habit
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2) HABIT COMPLETION LOGS (each completion/check-in) - renamed to avoid conflict
create table if not exists public.habit_completion_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  slug text not null references public.habit_template(slug) on update cascade on delete restrict,
  logged_at timestamptz not null default now(),
  amount numeric,           -- e.g., reps or count (optional)
  duration_min numeric,     -- minutes (optional)
  completed boolean not null default true,
  meta jsonb
);

create index if not exists hcl_user_date_idx on public.habit_completion_log(user_id, logged_at desc);
create index if not exists hcl_slug_idx on public.habit_completion_log(slug);

alter table public.habit_completion_log enable row level security;
drop policy if exists hcl_owner_all on public.habit_completion_log;
create policy hcl_owner_all on public.habit_completion_log
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3) RPCs: Start a habit + Quick log
create or replace function public.rpc_add_user_habit(
  p_slug text,
  p_schedule jsonb default jsonb_build_object('type','daily'),
  p_reminder_at time without time zone default null,
  p_target numeric default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.habit_template where slug = p_slug) then
    raise exception 'unknown habit slug %', p_slug;
  end if;

  insert into public.user_habit(user_id, slug, schedule, reminder_at, target, notes)
  values (auth.uid(), p_slug, coalesce(p_schedule, jsonb_build_object('type','daily')), p_reminder_at, p_target, p_notes)
  returning id into v_id;

  return v_id;
end;
$$;

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

  return v_id;
end;
$$;

-- Allow app users to call the RPCs
revoke all on function public.rpc_add_user_habit(text,jsonb,time without time zone,numeric,text) from public, anon;
revoke all on function public.rpc_log_habit(text,numeric,numeric,boolean,jsonb) from public, anon;
grant execute on function public.rpc_add_user_habit(text,jsonb,time without time zone,numeric,text) to authenticated;
grant execute on function public.rpc_log_habit(text,numeric,numeric,boolean,jsonb) to authenticated;

-- 4) Lightweight "For You" recommendations (top 2 per domain, excluding already-active)
create or replace function public.rpc_recommend_habits()
returns table(slug text, name text, domain text, reason text)
language sql
security definer
set search_path = public, pg_temp
as $$
with active as (
  select slug from public.user_habit where user_id = auth.uid() and status = 'active'
),
scored as (
  select ht.slug, ht.name, ht.domain,
         (case when ht.difficulty='easy' then 3 when ht.difficulty='medium' then 2 else 1 end)
       + (case when ht.tags ilike '%sleep%' then 1 else 0 end)
       + (case when ht.tags ilike '%protein%' then 1 else 0 end) as score
  from public.habit_template ht
  where ht.slug not in (select slug from active)
),
ranked as (
  select *, row_number() over (partition by domain order by score desc, name asc) rnk
  from scored
)
select slug, name, domain, 'Great starter in '||domain||' and easy to adopt.' as reason
from ranked
where rnk <= 2
order by domain, rnk;
$$;

-- 5) Progress views for weekly/monthly reporting (using correct table name)
create or replace view public.vw_habit_progress_week as
select user_id,
       slug,
       date_trunc('week', logged_at)::date as period_start,
       count(*) filter (where completed) as completions,
       sum(duration_min) as minutes
from public.habit_completion_log
group by 1,2,3;

create or replace view public.vw_habit_progress_month as
select user_id,
       slug,
       date_trunc('month', logged_at)::date as period_start,
       count(*) filter (where completed) as completions,
       sum(duration_min) as minutes
from public.habit_completion_log
group by 1,2,3;

grant select on public.vw_habit_progress_week  to authenticated;
grant select on public.vw_habit_progress_month to authenticated;