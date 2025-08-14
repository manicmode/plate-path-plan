-- Re-create the RPC the dropdown uses
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

-- Make sure select works through RLS (idempotent)
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