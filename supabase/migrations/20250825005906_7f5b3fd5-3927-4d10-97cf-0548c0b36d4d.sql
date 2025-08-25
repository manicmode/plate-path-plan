-- Fix schema qualification in award_points_secure function

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
  cid uuid := public.get_active_challenge_id();  -- schema-qualified
begin
  if uid is null then
    raise exception 'Authentication required';
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