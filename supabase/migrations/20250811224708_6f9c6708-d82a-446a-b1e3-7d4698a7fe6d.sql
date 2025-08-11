-- ===============================
-- RLS FIX: challenge_members + challenges
-- Safe, non-recursive policies
-- ===============================
begin;

-- 1) Hard reset challenge_members policies
alter table public.challenge_members disable row level security;

do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='challenge_members'
  loop
    execute format('drop policy if exists %I on public.challenge_members;', p.policyname);
  end loop;
end $$;

alter table public.challenge_members enable row level security;

-- 2) Recreate minimal, non-recursive policies on challenge_members

-- A) Users can see THEIR OWN membership rows
create policy "cm_select_self"
  on public.challenge_members
  for select
  using (user_id = auth.uid());

-- B) Anyone can see members of PUBLIC challenges
create policy "cm_select_public_challenge_members"
  on public.challenge_members
  for select
  using (
    exists (
      select 1
      from public.challenges c
      where c.id = challenge_members.challenge_id
        and c.visibility = 'public'
    )
  );

-- C) Users can join a public challenge (insert their own row)
create policy "cm_insert_self_on_public"
  on public.challenge_members
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.challenges c
      where c.id = challenge_id
        and (
          c.visibility = 'public'
          or c.creator_id = auth.uid()  -- allow creator to add (if UI supports)
        )
    )
  );

-- D) Users can leave (delete) their own membership
create policy "cm_delete_self"
  on public.challenge_members
  for delete
  using (user_id = auth.uid());

-- 3) Ensure minimal policies on challenges (id, visibility, creator_id expected)

-- Enable RLS if not already
alter table public.challenges enable row level security;

-- View public challenges OR ones you created
create policy if not exists "challenges_select_public_or_creator"
  on public.challenges
  for select
  using (visibility = 'public' or creator_id = auth.uid());

-- Create challenges (must set creator_id = auth.uid())
create policy if not exists "challenges_insert_creator"
  on public.challenges
  for insert
  with check (creator_id = auth.uid());

-- Update/Delete only by creator
create policy if not exists "challenges_update_creator"
  on public.challenges
  for update
  using (creator_id = auth.uid());

create policy if not exists "challenges_delete_creator"
  on public.challenges
  for delete
  using (creator_id = auth.uid());

commit;