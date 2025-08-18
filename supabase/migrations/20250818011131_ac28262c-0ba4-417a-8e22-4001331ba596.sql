-- Perf for trending query
create index if not exists habit_template_time_idx
  on public.habit(template_id, created_at desc);

-- Global trending (last 14 days), SECURITY DEFINER to bypass RLS
create or replace function public.habit_templates_trending_fn(p_limit int default 8)
returns table(
  id uuid,
  slug text,
  name text,
  domain habit_domain,
  category text,
  adds_last_14d bigint
)
language sql
security definer
set search_path = public
as $$
  select
    t.id, t.slug, t.name, t.domain, t.category,
    count(h.*) as adds_last_14d
  from public.habit_template t
  left join public.habit h
    on h.template_id = t.id
   and h.created_at >= now() - interval '14 days'
  group by t.id, t.slug, t.name, t.domain, t.category
  order by adds_last_14d desc, t.name asc
  limit p_limit;
$$;