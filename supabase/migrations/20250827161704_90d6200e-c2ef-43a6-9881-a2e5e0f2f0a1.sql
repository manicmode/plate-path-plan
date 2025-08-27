-- 0) helper (idempotent; you already created this for other tables)
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 1) table
create table if not exists public.subtext_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  picked_id text not null,
  category text not null,
  event text not null check (event in ('shown','cta')),
  reason text,
  run_id text,
  ts timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) RLS
alter table public.subtext_events enable row level security;

create policy "Users can view their own subtext events"
  on public.subtext_events for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subtext events"
  on public.subtext_events for insert
  with check (auth.uid() = user_id);

-- (recommended) allow safe updates by the owner
create policy "Users can update their own subtext events"
  on public.subtext_events for update
  using (auth.uid() = user_id);

-- 3) indexes
create unique index if not exists idx_subtext_events_dedup
  on public.subtext_events (user_id, picked_id, event, run_id)
  where run_id is not null;

create index if not exists idx_subtext_events_user_ts
  on public.subtext_events (user_id, ts desc);

-- (recommended) general ts and per-picked_id time indexes for metrics
create index if not exists idx_subtext_events_ts
  on public.subtext_events (ts desc);

create index if not exists idx_subtext_events_pid_ts
  on public.subtext_events (picked_id, ts desc);

-- 4) updated_at trigger (fixed function name)
drop trigger if exists update_subtext_events_updated_at on public.subtext_events;
create trigger update_subtext_events_updated_at
  before update on public.subtext_events
  for each row execute function public.tg_set_updated_at();

-- 5) daily metrics view (last 30 days)
create or replace view public.v_subtext_daily_metrics as
with base as (
  select
    date_trunc('day', ts) as day,
    picked_id,
    category,
    count(*) filter (where event = 'shown')     as shown,
    count(*) filter (where event = 'cta')       as cta,
    count(distinct user_id)                     as users
  from public.subtext_events
  where ts >= now() - interval '30 days'
  group by 1,2,3
)
select
  day,
  picked_id,
  category,
  shown,
  cta,
  users,
  round((cta::numeric * 100) / nullif(shown,0), 2) as ctr_pct
from base
order by day desc, shown desc;

grant select on public.v_subtext_daily_metrics to authenticated;