-- Diagnostics: return whether the current user has a rank_of_20 challenge and its ids
create or replace function public.diag_rank20()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  payload jsonb;
begin
  payload := jsonb_build_object(
    'user_id', uid,
    'rank20_challenge', (
      select to_jsonb(t)
      from (
        select pc.id as challenge_id,
               pc.title,
               rg.id as group_id,
               rg.batch_number,
               exists (
                 select 1 from public.private_challenge_participations p
                 where p.private_challenge_id = pc.id and p.user_id = uid
               ) as is_member
        from public.private_challenges pc
        left join public.rank20_groups rg on rg.challenge_id = pc.id
        where pc.challenge_type = 'rank_of_20'
        order by pc.created_at asc
        limit 1
      ) t
    )
  );
  return payload;
end
$$;
grant execute on function public.diag_rank20() to authenticated;

-- Make any "Rank of 20" rows use the proper challenge_type
update public.private_challenges
set challenge_type = 'rank_of_20'
where lower(title) = 'rank of 20' and challenge_type <> 'rank_of_20';

-- Ensure there is at least one rank20 group + challenge pair
do $$
declare
  any_rank uuid;
  grp uuid;
begin
  select pc.id into any_rank
  from public.private_challenges pc
  where pc.challenge_type = 'rank_of_20'
  limit 1;

  if any_rank is null then
    insert into public.rank20_groups default values returning id into grp;

    -- create the challenge and link it
    insert into public.private_challenges
      (title, description, creator_id, category, challenge_type, duration_days, start_date, max_participants, status)
    values
      ('Rank of 20',
       'Compete in a 20-person live ranking. Auto-assigned on signup.',
       coalesce(auth.uid(), (select id from auth.users limit 1)),
       'competition',
       'rank_of_20',
       30, current_date, 20, 'active')
    returning id into any_rank;

    update public.rank20_groups set challenge_id = any_rank where id = grp;
  end if;
end $$;

-- Assign the current user (if running with a session); if not, this NOOPs
select public.assign_rank20(auth.uid()) where auth.uid() is not null;

-- RLS sanity (ensure reads work)
alter table public.rank20_groups  enable row level security;
alter table public.rank20_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='rank20_groups' and policyname='r20_groups_select_member') then
    create policy "r20_groups_select_member" on public.rank20_groups
      for select using (exists (select 1 from public.rank20_members m where m.group_id = rank20_groups.id and m.user_id = auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where tablename='rank20_members' and policyname='r20_members_select_member') then
    create policy "r20_members_select_member" on public.rank20_members
      for select using (
        user_id = auth.uid()
        or exists (select 1 from public.rank20_members m2 where m2.group_id = rank20_members.group_id and m2.user_id = auth.uid())
      );
  end if;
end $$;