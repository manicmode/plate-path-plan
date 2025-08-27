-- 0) helper (only if you don't already have it)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 1) table
create table if not exists public.nudge_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  nudge_id text not null,
  event text not null check (event in ('shown','dismissed','cta')),
  reason text,
  run_id text,                                -- helps de-dupe a single render
  ts timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) indexes (fast "last shown" lookups + reporting)
create index if not exists idx_nudge_events_user_nudge_ts
  on public.nudge_events(user_id, nudge_id, ts desc);
create index if not exists idx_nudge_events_user_ts
  on public.nudge_events(user_id, ts desc);
create index if not exists idx_nudge_events_ts on public.nudge_events(ts desc);

-- optional de-dupe within a render (same event logged twice)
create unique index if not exists uq_nudge_events_render
  on public.nudge_events(user_id, nudge_id, event, run_id)
  where run_id is not null;

-- 3) RLS
alter table public.nudge_events enable row level security;

create policy "Users can view their own nudge events"
  on public.nudge_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own nudge events"
  on public.nudge_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own nudge events"
  on public.nudge_events for update
  using (auth.uid() = user_id);

-- 4) updated_at trigger
drop trigger if exists trigger_nudge_events_updated_at on public.nudge_events;
create trigger trigger_nudge_events_updated_at
  before update on public.nudge_events
  for each row execute function public.tg_set_updated_at();