-- Recreate diagnostics RPC
create or replace function public.diag_rank20()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'uid', uid,
    'r20_challenges', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select pc.id as challenge_id, pc.title, pc.challenge_type,
               rg.id as group_id, rg.batch_number,
               exists (
                 select 1 from public.rank20_members m
                 where m.group_id = rg.id and m.user_id = uid
               ) as is_member
        from public.rank20_groups rg
        join public.private_challenges pc on pc.id = rg.challenge_id
      ) t
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select rm.group_id, rm.user_id
        from public.rank20_members rm
        where rm.user_id = uid
      ) t
    ), '[]'::jsonb)
  );
end $$;
grant execute on function public.diag_rank20() to authenticated;

-- Ensure an r20 group + challenge exist
do $$
declare gid uuid; cid uuid;
begin
  select id, challenge_id into gid, cid
  from public.rank20_groups
  order by batch_number asc
  limit 1;

  if gid is null then
    insert into public.rank20_groups default values returning id into gid;
  end if;

  if cid is null then
    insert into public.private_challenges
      (title, description, creator_id, category, challenge_type, duration_days, start_date, max_participants, status)
    values
      ('Rank of 20',
       'Auto-assigned 20-person live rankings group.',
       coalesce(auth.uid(), (select id from auth.users limit 1)),
       'competition', 'rank_of_20', 30, current_date, 20, 'active')
    returning id into cid;
    update public.rank20_groups set challenge_id = cid where id = gid;
  end if;
end $$;

-- Normalize any stray titles
update public.private_challenges
set challenge_type = 'rank_of_20'
where lower(title) = 'rank of 20';

-- Assign current session (no-op if already)
select public.assign_rank20(auth.uid()) where auth.uid() is not null;