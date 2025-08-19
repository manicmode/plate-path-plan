-- User profile table for recommendation tuning
create table if not exists public.user_profile (
  user_id uuid primary key default auth.uid(),
  goals jsonb not null default '[]'::jsonb,         -- e.g. ["sleep","fat-loss","strength"]
  constraints jsonb not null default '[]'::jsonb,   -- e.g. ["time-poor","no-equipment","joint-pain"]
  preferences jsonb not null default '[]'::jsonb,   -- e.g. ["morning","outdoor","evening"]
  updated_at timestamptz not null default now()
);

alter table public.user_profile enable row level security;

drop policy if exists up_owner on public.user_profile;
create policy up_owner on public.user_profile
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- RPC to upsert user profile
create or replace function public.rpc_upsert_user_profile(
  p_goals jsonb default '[]'::jsonb,
  p_constraints jsonb default '[]'::jsonb,
  p_preferences jsonb default '[]'::jsonb
) returns void language sql security definer set search_path=public,pg_temp as $$
  insert into public.user_profile(user_id, goals, constraints, preferences, updated_at)
  values (auth.uid(), coalesce(p_goals,'[]'::jsonb), coalesce(p_constraints,'[]'::jsonb), coalesce(p_preferences,'[]'::jsonb), now())
  on conflict (user_id) do update
    set goals = excluded.goals,
        constraints = excluded.constraints,
        preferences = excluded.preferences,
        updated_at = now();
$$;

grant select on public.user_profile to authenticated;
revoke all on function public.rpc_upsert_user_profile(jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.rpc_upsert_user_profile(jsonb,jsonb,jsonb) to authenticated;