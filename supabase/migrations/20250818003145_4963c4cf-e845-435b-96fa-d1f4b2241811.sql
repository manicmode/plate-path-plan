-- 1) Constraint: goal_type/target consistency (enum uses 'bool')
alter table public.habit_template
  add constraint if not exists chk_target_requirements
  check (
    (goal_type = 'bool'::habit_goal_type and default_target is null)
    or (goal_type in ('count'::habit_goal_type,'duration'::habit_goal_type))
  );

-- 2) View: distinct categories per domain (for the dropdown)
create or replace view public.habit_template_categories as
select domain, category
from public.habit_template
where category is not null and length(btrim(category)) > 0
group by domain, category
order by domain, category;

-- 3) Extension: trigram search performance
create extension if not exists pg_trgm;

-- 4) Index: fast name search
create index if not exists habit_template_name_trgm_idx
on public.habit_template using gin (name gin_trgm_ops);