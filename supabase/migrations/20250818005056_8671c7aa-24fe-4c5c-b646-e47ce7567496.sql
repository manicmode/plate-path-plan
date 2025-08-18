create or replace function public.habit_template_recommend(
  p_user uuid,
  p_domain habit_domain default null,
  p_max_minutes int default 20,
  p_max_difficulty text default 'medium',  -- 'easy' < 'medium' < 'hard'
  p_limit int default 12
)
returns table(
  id uuid,
  slug text,
  name text,
  domain habit_domain,
  category text,
  summary text,
  goal_type habit_goal_type,
  estimated_minutes int,
  difficulty text,
  tags text,
  score numeric,
  reason text
)
language sql
security definer
set search_path = public
as $$
  with mapped as (
    select t.*,
           case t.difficulty
             when 'easy' then 1 when 'medium' then 2 when 'hard' then 3 else 2 end as diff_score,
           case p_max_difficulty
             when 'easy' then 1 when 'medium' then 2 when 'hard' then 3 else 2 end as max_diff_score
    from public.habit_template t
  ),
  filtered as (
    select *
    from mapped
    where (p_domain is null or domain = p_domain)
      and (estimated_minutes is null or estimated_minutes <= coalesce(p_max_minutes, 9999))
      and diff_score <= max_diff_score
  ),
  ranked as (
    select
      id, slug, name, domain, category, summary, goal_type,
      estimated_minutes, difficulty, tags,
      (coalesce(10.0 - least(coalesce(estimated_minutes,10),10), 0)) * 0.6
      + (3.5 - diff_score) * 0.4
      as score,
      concat_ws(' • ',
        case when estimated_minutes is not null then estimated_minutes::text || ' min' end,
        difficulty
      ) as reason
    from filtered
  )
  select *
  from ranked
  order by score desc nulls last, name asc
  limit p_limit;
$$;