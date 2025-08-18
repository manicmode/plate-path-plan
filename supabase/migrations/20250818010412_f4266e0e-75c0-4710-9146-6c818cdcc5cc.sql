-- 1A) Search Analytics table + RLS
create table if not exists public.habit_search_events(
  id bigserial primary key,
  user_id uuid references auth.users(id),
  q text not null,
  domain habit_domain,
  category text,
  results int,
  top_slug text,
  created_at timestamptz not null default now()
);

alter table public.habit_search_events enable row level security;

-- RLS: users can insert their own logs; read back only their own (optional)
drop policy if exists p_hse_ins on public.habit_search_events;
create policy p_hse_ins on public.habit_search_events
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists p_hse_sel on public.habit_search_events
for select to authenticated
using (user_id = auth.uid());

-- perf
create index if not exists hse_created_idx on public.habit_search_events(created_at desc);