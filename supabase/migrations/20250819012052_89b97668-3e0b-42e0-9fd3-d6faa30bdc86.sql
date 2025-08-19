-- Habit Reports v1 — corrected & robust

-- 1) Detailed per-habit report
create or replace function public.rpc_habit_report(
  period text default 'week',
  p_start date default null
) returns table(
  user_habit_id uuid,
  slug text,
  name text,
  domain text,
  expected_count integer,
  completions bigint,
  minutes numeric,
  adherence_pct numeric,
  current_streak integer,
  last_logged_at timestamptz,
  reminder_at time without time zone
)
language sql
security definer
set search_path = public, pg_temp
as $$
with bounds as (
  select case
    when period = 'week'  then coalesce(date_trunc('week',  p_start::timestamp), date_trunc('week',  now()))::date
    when period = 'month' then coalesce(date_trunc('month', p_start::timestamp), date_trunc('month', now()))::date
    else                        coalesce(date_trunc('week',  p_start::timestamp), date_trunc('week',  now()))::date
  end as start_date
)
, rng as (
  select b.start_date
       , (case when period = 'week'  then b.start_date + interval '7 days'
               when period = 'month' then b.start_date + interval '1 month' end)::date as end_date
  from bounds b
)
, active as (
  select uh.id, uh.user_id, uh.slug, uh.schedule, uh.reminder_at, uh.start_date
  from public.user_habit uh
  where uh.user_id = auth.uid()
    and uh.status = 'active'
)
, expected as (
  -- count only days within range AND on/after the habit's start_date
  select a.id as user_habit_id,
         count(*)::int as expected_count
  from active a
  cross join rng r
  cross join generate_series(r.start_date, (r.end_date - 1), interval '1 day') g(day)
  where g.day::date >= a.start_date
    and (
      coalesce(a.schedule->>'type','daily') = 'daily'
      or (
        coalesce(a.schedule->>'type','daily') = 'weekly'
        and lower(to_char(g.day, 'dy')) in (
          select lower(x) from jsonb_array_elements_text(a.schedule->'days') x
        )
      )
    )
  group by a.id
)
, comps as (
  select a.id as user_habit_id,
         count(h.id)::bigint as completions,
         coalesce(sum(coalesce(h.duration_min,0)),0) as minutes,
         max(h.logged_at) as last_logged_at
  from active a
  cross join rng r
  left join public.habit_completion_log h
    on h.user_id = a.user_id
   and h.slug    = a.slug
   and h.logged_at >= r.start_date
   and h.logged_at <  r.end_date
  group by a.id
)
, streaks as (
  -- simple daily streak: consecutive days ending today that have at least one completion
  -- (works for both daily/weekly as a v1 metric)
  select a.id as user_habit_id,
         coalesce((
           select g.d  -- first missing-day offset from today
           from generate_series(0, 365) as g(d)
           left join public.habit_completion_log h
             on h.user_id = a.user_id
            and h.slug    = a.slug
            and date(h.logged_at) = current_date - g.d
           where h.id is null
           order by g.d
           limit 1
         ), 0) as current_streak
  from active a
)
select
  a.id                               as user_habit_id,
  a.slug,
  ht.name,
  ht.domain,
  coalesce(e.expected_count,0)       as expected_count,
  coalesce(c.completions,0)          as completions,
  coalesce(c.minutes,0)              as minutes,
  case when coalesce(e.expected_count,0) > 0
       then round((c.completions::numeric / e.expected_count::numeric) * 100, 1)
       else 0 end                    as adherence_pct,
  coalesce(s.current_streak,0)       as current_streak,
  c.last_logged_at,
  a.reminder_at
from active a
join public.habit_template ht on ht.slug = a.slug
left join expected e on e.user_habit_id = a.id
left join comps    c on c.user_habit_id = a.id
left join streaks  s on s.user_habit_id = a.id
order by adherence_pct asc, ht.name asc;
$$;

-- 2) KPI rollup
create or replace function public.rpc_habit_kpis(
  period text default 'week',
  p_start date default null
) returns table(
  active_habits bigint,
  total_expected bigint,
  total_completions bigint,
  overall_adherence_pct numeric,
  total_minutes numeric,
  streak_leader_slug text,
  streak_leader_days integer
)
language sql
security definer
set search_path = public, pg_temp
as $$
with b as (
  select case
    when period = 'week'  then coalesce(date_trunc('week',  p_start::timestamp), date_trunc('week',  now()))::date
    when period = 'month' then coalesce(date_trunc('month', p_start::timestamp), date_trunc('month', now()))::date
    else                        coalesce(date_trunc('week',  p_start::timestamp), date_trunc('week',  now()))::date
  end as start_date
)
, a as (
  select uh.id, uh.slug
  from public.user_habit uh
  where uh.user_id = auth.uid()
    and uh.status = 'active'
)
, r as (
  select * from public.rpc_habit_report(period, (select start_date from b))
)
select
  (select count(*) from a)                                         as active_habits,
  coalesce(sum(r.expected_count),0)                                as total_expected,
  coalesce(sum(r.completions),0)                                   as total_completions,
  case when coalesce(sum(r.expected_count),0) > 0
       then round((sum(r.completions)::numeric / sum(r.expected_count)::numeric) * 100, 1)
       else 0 end                                                  as overall_adherence_pct,
  coalesce(sum(r.minutes),0)                                       as total_minutes,
  (select r2.slug from r r2 order by r2.current_streak desc, r2.name asc limit 1) as streak_leader_slug,
  coalesce((select r2.current_streak from r r2 order by r2.current_streak desc, r2.name asc limit 1), 0) as streak_leader_days;
$$;

-- Grants
grant execute on function public.rpc_habit_report(text, date) to authenticated;
grant execute on function public.rpc_habit_kpis(text, date)  to authenticated;