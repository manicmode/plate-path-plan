-- ============================
-- Habit Library schema (templates) - FINAL
-- ============================

-- Enums
do $$ begin
  create type habit_domain as enum ('nutrition','exercise','recovery');
exception when duplicate_object then null; end $$;

do $$ begin
  create type habit_goal_type as enum ('count','duration','boolean');
exception when duplicate_object then null; end $$;

-- Table
create table if not exists public.habit_template (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  name               text not null,
  domain             habit_domain not null,
  category           text,
  summary            text,
  goal_type          habit_goal_type not null,
  default_target     numeric,              -- nullable for boolean goals
  min_viable         text,
  time_windows       jsonb,                -- [{start,end}]
  suggested_rules    jsonb,                -- [{type, params}]
  cues_and_stacking  text,
  equipment          text,
  contraindications  text,
  difficulty         text check (difficulty in ('easy','medium','hard')),
  estimated_minutes  int,
  coach_copy         jsonb,                -- {reminder_line, encourage_line, recovery_line, celebration_line}
  tags               text,
  sources            text,
  created_at         timestamptz not null default now(),

  -- Data hygiene guards
  constraint chk_target_nonneg check (default_target is null or default_target >= 0),
  constraint chk_minutes_nonneg check (estimated_minutes is null or estimated_minutes >= 0),
  constraint chk_target_requirements check (
    (goal_type = 'boolean' and default_target is null)
    or (goal_type in ('count','duration'))
  ),
  constraint chk_slug_not_blank check (length(btrim(coalesce(slug,''))) > 0),
  constraint chk_name_not_blank check (length(btrim(coalesce(name,''))) > 0)
);

-- Normalize slug to lowercase on insert/update
create or replace function public.habit_template_slug_lowercase()
returns trigger language plpgsql as $$
begin
  if new.slug is not null then
    new.slug := lower(new.slug);
  end if;
  return new;
end $$;

drop trigger if exists trg_habit_template_slug_lowercase on public.habit_template;
create trigger trg_habit_template_slug_lowercase
before insert or update on public.habit_template
for each row execute function public.habit_template_slug_lowercase();

-- RLS: public read; no client writes (service role bypasses RLS)
alter table public.habit_template enable row level security;

drop policy if exists habit_template_public_read on public.habit_template;
create policy habit_template_public_read
  on public.habit_template for select
  to public using (true);

-- Helpful indexes
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

-- Suggested partial index to speed category filter
create index if not exists habit_template_category_idx on public.habit_template (category) where category is not null;

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