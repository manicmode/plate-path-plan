-- CSV export view for Habit Central (idempotent)
create or replace view public.habit_template_export as
select
  slug,
  name,
  domain,
  category,
  summary,
  goal_type,
  default_target,
  min_viable,
  estimated_minutes,
  difficulty,
  tags,
  sources
from public.habit_template
order by domain, name;

-- quick sanity
select * from public.habit_template_export limit 3;