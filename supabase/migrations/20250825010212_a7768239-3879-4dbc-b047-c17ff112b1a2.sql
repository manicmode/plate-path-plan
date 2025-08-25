-- Create the missing functions with proper NULL handling

-- Helper function to get active challenge ID
create or replace function public.get_active_challenge_id()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  col text;
  cid uuid;
begin
  -- Determine which column exists for ordering
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='arena_challenges' and column_name='started_at') then
    col := 'started_at';
  elsif exists (select 1 from information_schema.columns
                where table_schema='public' and table_name='arena_challenges' and column_name='starts_at') then
    col := 'starts_at';
  else
    col := 'created_at';
  end if;

  -- Get active challenge ID
  execute format($q$
    select id
    from public.arena_challenges
    where status = 'active'
    order by %I desc nulls last
    limit 1
  $q$, col)
  into cid;

  return cid;
end
$$;

-- Award points function with NULL guard
create or replace function public.award_points_secure(
  p_reason text, p_base_amount int, p_multiplier numeric default 1.0
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  pts int := least(greatest((p_base_amount * coalesce(p_multiplier,1))::int, 0), 1000);
  uid uuid := auth.uid();
  cid uuid := public.get_active_challenge_id();
begin
  if uid is null then
    raise exception 'Authentication required';
  end if;
  
  -- Guard against NULL challenge_id since arena_events.challenge_id is NOT NULL
  if cid is null then
    raise exception 'No active challenge found - cannot award points';
  end if;

  insert into public.arena_events (user_id, challenge_id, kind, points, occurred_at)
  values (
    uid,
    cid,
    p_reason,
    pts,
    now()
  );
end;
$$;

-- Grant permissions
revoke all on function public.get_active_challenge_id() from public;
grant execute on function public.get_active_challenge_id() to authenticated;

revoke all on function public.award_points_secure(text, int, numeric) from public;
grant execute on function public.award_points_secure(text, int, numeric) to authenticated;