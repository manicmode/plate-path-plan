-- Pre-reqs (should already exist, but idempotent):
create extension if not exists pg_trgm;

-- Ranked habit search RPC
create or replace function public.habit_template_search(
  p_q text,
  p_domain habit_domain default null,
  p_category text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table(
  id uuid,
  slug text,
  name text,
  domain habit_domain,
  category text,
  summary text,
  goal_type habit_goal_type,
  default_target numeric,
  min_viable text,
  time_windows jsonb,
  suggested_rules jsonb,
  cues_and_stacking text,
  equipment text,
  contraindications text,
  difficulty text,
  estimated_minutes int,
  coach_copy jsonb,
  tags text,
  sources text,
  created_at timestamptz,
  score numeric
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      t.*,
      -- full-text over name/category/tags
      to_tsvector('simple',
        coalesce(t.name,'') || ' ' || coalesce(t.category,'') || ' ' || coalesce(t.tags,'')
      ) as doc
    from public.habit_template t
    where (p_domain is null or t.domain = p_domain)
      and (p_category is null or t.category ilike '%' || p_category || '%')
  ),
  ranked as (
    select
      b.*,
      -- composite score: trigram on name/category/tags + ts_rank on doc
      greatest(
        similarity(b.name, coalesce(p_q,'')),
        similarity(coalesce(b.category,''), coalesce(p_q,'')) * 0.8,
        similarity(coalesce(b.tags,''), coalesce(p_q,'')) * 0.6
      )
      +
      coalesce(ts_rank(
        b.doc,
        websearch_to_tsquery('simple', coalesce(p_q,''))  -- handles multi-word
      ), 0) * 1.0
      as score
    from base b
  )
  select
    id, slug, name, domain, category, summary, goal_type, default_target,
    min_viable, time_windows, suggested_rules, cues_and_stacking, equipment,
    contraindications, difficulty, estimated_minutes, coach_copy, tags, sources,
    created_at, score
  from ranked
  where (coalesce(p_q,'') = ''  -- empty query returns everything ordered by name
         or score > 0)
  order by
    case when coalesce(p_q,'') = '' then null end,
    score desc nulls last,
    name asc
  limit p_limit
  offset p_offset;
$$;