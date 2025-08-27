-- Safe analyzer_failures table + RLS (idempotent)

-- 0) helper: admin check (uses JWT app_metadata.role === 'admin')
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce( (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false )
$$;

-- 1) table
create table if not exists public.analyzer_failures (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  provider text not null check (provider in ('google','openai','hybrid')),
  phase text not null check (phase in ('request','response','timeout','abort')),
  status text not null check (status in ('started','completed','error','timeout','aborted')),
  status_text text,
  error_code text,
  body_excerpt text,              -- first ~600 chars (trim in app)
  duration_ms integer,
  request_id text,
  created_at timestamptz not null default now()
);

-- 2) RLS
alter table public.analyzer_failures enable row level security;

-- Only admins (via JWT) or service_role can read
drop policy if exists "Admin can view all analyzer failures" on public.analyzer_failures;
create policy "Admins/service can view analyzer failures"
on public.analyzer_failures
for select
using ( public.is_admin() or auth.role() = 'service_role' );

-- Only service_role can insert (edge functions must use service key)
drop policy if exists "Service role can insert analyzer failures" on public.analyzer_failures;
create policy "Service role can insert analyzer failures"
on public.analyzer_failures
for insert
with check ( auth.role() = 'service_role' );

-- 3) indexes
create index if not exists idx_analyzer_failures_run_id
  on public.analyzer_failures (run_id);
create index if not exists idx_analyzer_failures_created_at
  on public.analyzer_failures (created_at desc);