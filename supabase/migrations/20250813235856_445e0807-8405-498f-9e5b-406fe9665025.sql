-- 1) Ensure a Rank-of-20 group & challenge exist; link them
do $$
declare
  grp_id uuid;
  ch_id  uuid;
begin
  -- Get existing group first
  select g.id into grp_id
  from public.rank20_groups g
  order by g.batch_number asc
  limit 1;

  if grp_id is null then
    insert into public.rank20_groups default values returning id into grp_id;
  end if;

  -- Check if this group has a linked challenge
  select challenge_id into ch_id
  from public.rank20_groups
  where id = grp_id;

  if ch_id is null then
    insert into public.private_challenges
      (title, description, creator_id, category, challenge_type, duration_days, start_date, max_participants, status)
    values
      ('Rank of 20',
       'Auto-assigned 20-person live rankings group.',
       coalesce(auth.uid(), (select id from auth.users limit 1)),
       'competition',
       'rank_of_20',
       30, current_date, 20, 'active')
    returning id into ch_id;

    update public.rank20_groups set challenge_id = ch_id where id = grp_id;
  end if;
end $$;

-- 2) Force any "Rank of 20" rows to correct type
update public.private_challenges
set challenge_type = 'rank_of_20'
where lower(title) = 'rank of 20';

-- 3) Assign current user to Rank-of-20 (no-op if already a member)
select public.assign_rank20(auth.uid()) where auth.uid() is not null;

-- 4) RPC for dropdown: return all billboard-capable challenges for the current user,
--    including Rank-of-20 and any private challenges they created or joined.
create or replace function public.my_billboard_challenges()
returns table(
  id uuid,
  title text,
  category text,
  challenge_type text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  -- rank_of_20 (via group linkage)
  with r20 as (
    select pc.id, pc.title, pc.category, pc.challenge_type, pc.created_at
    from public.rank20_members rm
    join public.rank20_groups rg on rg.id = rm.group_id
    join public.private_challenges pc on pc.id = rg.challenge_id
    where rm.user_id = auth.uid()
  ),
  mine as (
    -- any private challenge I'm a member of (creator or participant)
    select distinct pc.id, pc.title, pc.category, pc.challenge_type, pc.created_at
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
    where pc.creator_id = auth.uid() or p.user_id = auth.uid()
  )
  select * from r20
  union
  select * from mine
$$;
grant execute on function public.my_billboard_challenges() to authenticated;