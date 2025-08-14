-- Recreate the dropdown RPC and grants (SECURITY DEFINER + RLS sanity)
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
  with r20 as (
    select pc.id, pc.title, pc.category, pc.challenge_type, pc.created_at
    from public.rank20_members rm
    join public.rank20_groups rg on rg.id = rm.group_id
    join public.private_challenges pc on pc.id = rg.challenge_id
    where rm.user_id = auth.uid()
  ),
  mine as (
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

-- Recreate seeding RPC
create or replace function public.seed_billboard_events(_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id and p.user_id = auth.uid()
    where pc.id = _challenge_id
      and (pc.creator_id = auth.uid() or p.user_id is not null)
  ) then
    raise exception 'not a member of this challenge';
  end if;

  insert into public.billboard_events (challenge_id, author_system, author_user_id, kind, title, body, meta, created_at)
  values
    (_challenge_id, true, auth.uid(), 'rank_jump', 'Sally rockets to #2!', 'Up 3 places overnight. Morning runs paying off.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'streak', 'Tom hits a 14-day streak', 'Longest in the group so far.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'team_record', 'Team record day', 'Average steps 12,400 — new high!', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'milestone', 'Mary crosses 100km total', 'She''s been unstoppable this week.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'comeback', 'Danny climbs back into top 3', 'Was in 7th last week.', '{}'::jsonb, now());
end $$;
grant execute on function public.seed_billboard_events(uuid) to authenticated;

-- RLS sanity (only if missing)
alter table public.rank20_groups  enable row level security;
alter table public.rank20_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='rank20_groups' and policyname='r20_groups_select_member') then
    create policy "r20_groups_select_member" on public.rank20_groups
      for select using (
        exists (select 1 from public.rank20_members m where m.group_id = rank20_groups.id and m.user_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where tablename='rank20_members' and policyname='r20_members_select_member') then
    create policy "r20_members_select_member" on public.rank20_members
      for select using (
        user_id = auth.uid()
        or exists (select 1 from public.rank20_members m2 where m2.group_id = rank20_members.group_id and m2.user_id = auth.uid())
      );
  end if;
end $$;