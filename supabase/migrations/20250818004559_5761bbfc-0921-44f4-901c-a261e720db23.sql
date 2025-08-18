-- DB hardening: prevent duplicate user habits + fast lookups

-- 1) unique guard: 1 template per user (using template_id)
create unique index if not exists user_habit_unique
on public.habit (user_id, template_id);

-- 2) speed up per-user queries
create index if not exists habit_user_idx on public.habit(user_id);

-- 3) backfill de-dupe: keep newest row per (user_id, template_id)
--    only removes duplicates if they exist
with ranked as (
  select ctid, user_id, template_id,
         row_number() over (partition by user_id, template_id order by created_at desc) as rn
  from public.habit
  where template_id is not null  -- only consider habits with template references
)
delete from public.habit h
using ranked r
where h.ctid = r.ctid and r.rn > 1;