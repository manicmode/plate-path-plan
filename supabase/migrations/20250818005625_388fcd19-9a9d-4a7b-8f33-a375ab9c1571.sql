-- 1) tiny synonyms table (multi-word ok)
create table if not exists public.habit_search_synonyms (
  id bigserial primary key,
  term text not null,
  synonym text not null,
  weight numeric not null default 0.3,  -- boost added to score when matched
  created_at timestamptz not null default now()
);

-- helpful index
create index if not exists habit_search_synonyms_term_idx
  on public.habit_search_synonyms (lower(term));

-- 2) seed a few useful pairs (safe upserts)
insert into public.habit_search_synonyms(term, synonym, weight)
values
  ('veg','vegetable',0.35),
  ('veg','vegetables',0.35),
  ('veggies','vegetables',0.35),
  ('walk','steps',0.25),
  ('hydrate','water',0.3),
  ('protein','macronutrients',0.2),
  ('sleep','bedtime',0.25),
  ('journal','journaling',0.25)
on conflict do nothing;

-- 3) search RPC with synonym boost (idempotent replace)
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
  with q as (
    select trim(coalesce(p_q,'')) as q
  ),
  syn as (
    -- gather synonyms for the raw query tokens
    select s.synonym, max(s.weight) as w
    from q
    cross join lateral regexp_split_to_table(q.q, '\s+') as tok
    join public.habit_search_synonyms s
      on lower(s.term) = lower(tok)
    group by s.synonym
  ),
  base as (
    select
      t.*,
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
      -- primary similarity against raw q
      greatest(
        similarity(b.name, (select q from q)),
        similarity(coalesce(b.category,''), (select q from q)) * 0.8,
        similarity(coalesce(b.tags,''), (select q from q)) * 0.6
      )
      +
      -- full-text relevance
      coalesce(ts_rank(
        b.doc,
        websearch_to_tsquery('simple', (select q from q))
      ), 0) * 1.0
      +
      -- synonym boosts: sum(weight * best similarity to each synonym)
      coalesce((
        select sum(s.w * greatest(
          similarity(b.name, s.synonym),
          similarity(coalesce(b.category,''), s.synonym) * 0.8,
          similarity(coalesce(b.tags,''), s.synonym) * 0.6
        ))
        from syn s
      ), 0) as score
    from base b
  )
  select
    id, slug, name, domain, category, summary, goal_type, default_target,
    min_viable, time_windows, suggested_rules, cues_and_stacking, equipment,
    contraindications, difficulty, estimated_minutes, coach_copy, tags, sources,
    created_at, score
  from ranked
  where (coalesce((select q from q), '') = '' or score > 0)
  order by
    case when coalesce((select q from q), '') = '' then null end,
    score desc nulls last,
    name asc
  limit p_limit
  offset p_offset;
$$;