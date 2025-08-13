-- Update the rank20 functions with security safeguards
create or replace function public._ensure_rank20_challenge(_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ch_id uuid;
  bn bigint;
  creator uuid;
begin
  select challenge_id, batch_number into ch_id, bn from public.rank20_groups where id = _group_id;
  if ch_id is not null then
    return ch_id;
  end if;

  -- Pick a system creator: use the current user if present; else the first admin/any user
  creator := auth.uid();

  insert into public.private_challenges (name, is_private, creator_id)
  values (format('Rank of 20 — Batch %s', bn), true, creator)
  returning id into ch_id;

  update public.rank20_groups set challenge_id = ch_id where id = _group_id;
  return ch_id;
end$$;

create or replace function public.assign_rank20(_user_id uuid)
returns table(group_id uuid, challenge_id uuid, batch_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  members_count int;
begin
  -- Find the lowest open group and lock it
  select g.*
  into g
  from public.rank20_groups g
  where not g.is_closed
  order by g.batch_number asc
  limit 1
  for update skip locked;

  -- If none, create a new group (batch_number auto)
  if not found then
    insert into public.rank20_groups default values
    returning * into g;
  end if;

  -- Ensure linked challenge exists
  g.challenge_id := public._ensure_rank20_challenge(g.id);

  -- Add user to group membership if not already
  insert into public.rank20_members (group_id, user_id)
  values (g.id, _user_id)
  on conflict do nothing;

  -- Add user to private_challenge_participations as well (so dropdown/Billboard just work)
  insert into public.private_challenge_participations (private_challenge_id, user_id)
  values (g.challenge_id, _user_id)
  on conflict do nothing;

  -- Close the group if it reached 20
  select count(*) into members_count from public.rank20_members where group_id = g.id;
  if members_count >= 20 then
    update public.rank20_groups set is_closed = true where id = g.id;
  end if;

  return query
    select g.id, g.challenge_id, g.batch_number;
end
$$;

-- Grant execute permissions
grant execute on function public.assign_rank20(uuid) to authenticated, anon;
grant execute on function public._ensure_rank20_challenge(uuid) to authenticated, anon;