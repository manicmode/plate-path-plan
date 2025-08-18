-- Health checks for habit templates (idempotent)
create or replace view public.habit_template_health as
select
  slug,
  name,
  (goal_type = 'bool' and default_target is not null)                            as bad_bool_target,
  (goal_type in ('count','duration') and default_target is null)                as missing_target,
  (estimated_minutes is not null and estimated_minutes < 0)                     as bad_minutes
from public.habit_template
where (goal_type = 'bool' and default_target is not null)
   or (goal_type in ('count','duration') and default_target is null)
   or (estimated_minutes is not null and estimated_minutes < 0);

-- Quick sanity: total issues
select count(*) as issues from public.habit_template_health;

-- Optional: preview a few rows with a human-readable "issues" string
select slug, name,
       concat_ws(', ',
         case when bad_bool_target then 'bool has target' end,
         case when missing_target then 'missing target' end,
         case when bad_minutes then 'negative minutes' end
       ) as issues
from public.habit_template_health
limit 10;