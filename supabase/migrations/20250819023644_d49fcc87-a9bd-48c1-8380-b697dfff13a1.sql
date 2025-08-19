-- Personalized recs v2 (profile-aware, safe fallbacks)
-- INPUT profile example:
-- {
--   "goals": ["sleep","fat-loss","strength"],
--   "constraints": ["time-poor","no-equipment","joint-pain"],
--   "preferences": ["morning","outdoor"]
-- }
create or replace function public.rpc_recommend_habits_v2(
  p_profile jsonb default '{}'::jsonb,
  p_per_domain int default 3
) returns table (
  slug text,
  name text,
  domain text,
  reason text,
  score numeric
)
language sql
security definer
set search_path = public, pg_temp
as $$
with me as (
  select auth.uid() as uid
),
active as (
  select slug from public.user_habit where user_id = (select uid from me) and status = 'active'
),
base as (
  select
    ht.slug, ht.name, ht.domain, ht.category, ht.tags,
    coalesce(ht.estimated_minutes, 10) as minutes,
    coalesce(ht.equipment,'') as equipment,
    -- difficulty weight
    (case ht.difficulty when 'easy' then 3 when 'medium' then 2 else 1 end) as w_diff,
    -- goal matches
    (case
      when (p_profile->'goals')::text ilike '%sleep%' and ht.tags ilike '%sleep%' then 3 else 0 end
    + case
      when (p_profile->'goals')::text ilike '%fat-loss%' and (ht.tags ilike '%zone2%' or ht.tags ilike '%steps%' or ht.tags ilike '%protein%' or ht.tags ilike '%fiber%') then 2 else 0 end
    + case
      when (p_profile->'goals')::text ilike '%strength%' and (ht.category = 'strength' or ht.tags ilike '%strength%') then 2 else 0 end
    ) as w_goal,
    -- constraints
    (case when (p_profile->'constraints')::text ilike '%time-poor%' and coalesce(ht.estimated_minutes,10) <= 10 then 1 else 0 end
    + case when (p_profile->'constraints')::text ilike '%no-equipment%' and coalesce(ht.equipment,'') = '' then 1 else 0 end
    + case when (p_profile->'constraints')::text ilike '%joint-pain%'  and (ht.tags ilike '%zone2%' or ht.tags ilike '%breathing%' or ht.tags ilike '%mobility%') then 1 else 0 end
    ) as w_constraints,
    -- preferences
    (case when (p_profile->'preferences')::text ilike '%morning%' and (ht.tags ilike '%morning%' or ht.category ilike '%circadian%') then 1 else 0 end
    + case when (p_profile->'preferences')::text ilike '%outdoor%'  and (ht.tags ilike '%outdoor%' or ht.tags ilike '%daylight%') then 1 else 0 end
    ) as w_prefs
  from public.habit_template ht
  where ht.slug not in (select slug from active)
),
scored as (
  select *,
    (w_diff + w_goal + w_constraints + w_prefs
     + case when domain = 'recovery' and (p_profile->'goals')::text ilike '%sleep%' then 1 else 0 end
     )::numeric as score
  from base
),
ranked as (
  select *,
         row_number() over (partition by domain order by score desc, name asc) as rnk
  from scored
)
select
  slug, name, domain,
  -- Friendly "why" reason:
  trim(both ' ' from
    concat_ws(' ',
      case
        when (w_goal >= 2) then 'Because it aligns with your goals.'
        when (w_constraints >= 2) then 'Quick, low-friction fit for your constraints.'
        when (w_prefs >= 1) then 'Matches your preferences.'
        else 'Great starter pick in this domain.'
      end,
      case when minutes <= 10 then '≈' || minutes::int || ' min.' end,
      case when equipment = '' then 'No equipment needed.' end
    )
  ) as reason,
  score
from ranked
where rnk <= greatest(1, p_per_domain)
order by domain, rnk;
$$;

grant execute on function public.rpc_recommend_habits_v2(jsonb,int) to authenticated;