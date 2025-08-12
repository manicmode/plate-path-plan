-- Reset any old policies
drop policy if exists read_challenge_messages on public.challenge_messages;
drop policy if exists post_challenge_messages on public.challenge_messages;
drop policy if exists select_challenge_messages on public.challenge_messages;
drop policy if exists insert_challenge_messages on public.challenge_messages;

-- SELECT: owner or joined member of public OR private challenge
create policy select_challenge_messages
on public.challenge_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.challenges c
    left join public.challenge_members m
      on m.challenge_id = c.id
     and m.user_id = auth.uid()
     and m.status = 'joined'
    where c.id = challenge_messages.challenge_id
      and (c.owner_user_id = auth.uid() or m.user_id is not null)
  )
  or exists (
    select 1
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
     and p.user_id = auth.uid()
     and p.status = 'joined'
    where pc.id = challenge_messages.challenge_id
      and (pc.creator_id = auth.uid() or p.user_id is not null)
  )
);

-- INSERT: same rule as SELECT
create policy insert_challenge_messages
on public.challenge_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.challenges c
    left join public.challenge_members m
      on m.challenge_id = c.id
     and m.user_id = auth.uid()
     and m.status = 'joined'
    where c.id = challenge_messages.challenge_id
      and (c.owner_user_id = auth.uid() or m.user_id is not null)
  )
  or exists (
    select 1
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
     and p.user_id = auth.uid()
     and p.status = 'joined'
    where pc.id = challenge_messages.challenge_id
      and (pc.creator_id = auth.uid() or p.user_id is not null)
  )
);