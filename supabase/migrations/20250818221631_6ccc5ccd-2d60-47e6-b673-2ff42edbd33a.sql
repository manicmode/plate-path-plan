-- Keep updated_at correct
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists t_touch_updated_at on public.user_habit;
create trigger t_touch_updated_at
before update on public.user_habit
for each row execute function public.tg_touch_updated_at();

-- Prevent duplicate ACTIVE enrollments per user/slug
create unique index if not exists uh_unique_active_per_slug
  on public.user_habit(user_id, slug)
  where status = 'active';

-- Speed "my progress" queries
create index if not exists hcl_user_slug_date_idx
  on public.habit_completion_log(user_id, slug, logged_at desc);