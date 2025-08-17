-- 1) Table (idempotent)
create table if not exists public.runtime_flags (
  name        text primary key,
  enabled     boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- 2) Auto-update updated_at on any UPDATE
create or replace function public._set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_runtime_flags_updated_at on public.runtime_flags;
create trigger trg_runtime_flags_updated_at
before update on public.runtime_flags
for each row execute function public._set_updated_at();

-- 3) RLS (readable by anon+authenticated; writes blocked except service role)
alter table public.runtime_flags enable row level security;

drop policy if exists runtime_flags_select on public.runtime_flags;
create policy runtime_flags_select on public.runtime_flags
  for select
  to anon, authenticated
  using (true);

-- blanket deny for mutating ops (service role bypasses RLS)
drop policy if exists runtime_flags_no_writes on public.runtime_flags;
create policy runtime_flags_no_writes on public.runtime_flags
  for all
  using (false);

-- 4) Grants (required even with RLS)
grant usage on schema public to anon, authenticated;
grant select on table public.runtime_flags to anon, authenticated;
-- (service_role generally has superuser-like privileges, but granting doesn't hurt)
grant all on table public.runtime_flags to service_role;

-- 5) Seed the hard-disable flag (for E2E)
insert into public.runtime_flags (name, enabled)
values ('arena_v2_hard_disable', true)
on conflict (name) do update
  set enabled = excluded.enabled, updated_at = now();