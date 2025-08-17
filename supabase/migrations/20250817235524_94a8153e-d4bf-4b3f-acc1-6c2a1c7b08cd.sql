-- Fix the index syntax and add upsert functions
-- Helpful indexes (corrected)
create index if not exists habit_template_domain_idx on public.habit_template (domain);
create index if not exists habit_template_search_idx
  on public.habit_template using gin (
    to_tsvector('simple',
      coalesce(name,'') || ' ' ||
      coalesce(category,'') || ' ' ||
      coalesce(tags,'')
    )
  );

-- Case-insensitive uniqueness for slug (lowered via trigger already)
create unique index if not exists habit_template_slug_ci_idx
  on public.habit_template (lower(slug));

-- Upsert a single template from jsonb
create or replace function public.habit_template_upsert_one(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.habit_template as t (
    slug, name, domain, category, summary, goal_type, default_target,
    min_viable, time_windows, suggested_rules, cues_and_stacking, equipment,
    contraindications, difficulty, estimated_minutes, coach_copy, tags, sources
  )
  values (
    lower(payload->>'slug'),
    payload->>'name',
    (payload->>'domain')::habit_domain,
    payload->>'category',
    payload->>'summary',
    (payload->>'goal_type')::habit_goal_type,
    nullif(payload->>'default_target','')::numeric,
    payload->>'min_viable',
    coalesce(payload->'time_windows','[]'::jsonb),
    coalesce(payload->'suggested_rules','[]'::jsonb),
    payload->>'cues_and_stacking',
    payload->>'equipment',
    payload->>'contraindications',
    nullif(payload->>'difficulty',''),
    nullif(payload->>'estimated_minutes','')::int,
    coalesce(payload->'coach_copy','{}'::jsonb),
    payload->>'tags',
    payload->>'sources'
  )
  on conflict (slug)
  do update set
    name               = excluded.name,
    domain             = excluded.domain,
    category           = excluded.category,
    summary            = excluded.summary,
    goal_type          = excluded.goal_type,
    default_target     = excluded.default_target,
    min_viable         = excluded.min_viable,
    time_windows       = excluded.time_windows,
    suggested_rules    = excluded.suggested_rules,
    cues_and_stacking  = excluded.cues_and_stacking,
    equipment          = excluded.equipment,
    contraindications  = excluded.contraindications,
    difficulty         = excluded.difficulty,
    estimated_minutes  = excluded.estimated_minutes,
    coach_copy         = excluded.coach_copy,
    tags               = excluded.tags,
    sources            = excluded.sources
  returning t.id into v_id;

  return v_id;
end $$;

-- Bulk upsert: array of jsonb
create or replace function public.habit_template_upsert_many(payloads jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  item jsonb;
begin
  for item in select * from jsonb_array_elements(payloads)
  loop
    perform public.habit_template_upsert_one(item);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Data hygiene helpers
alter table public.habit_template
  add constraint if not exists chk_slug_not_blank check (length(btrim(coalesce(slug,''))) > 0);

alter table public.habit_template  
  add constraint if not exists chk_name_not_blank check (length(btrim(coalesce(name,''))) > 0);

-- Suggested partial index to speed category filter
create index if not exists habit_template_category_idx on public.habit_template (category) where category is not null;