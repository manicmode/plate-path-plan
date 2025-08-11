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
          or c.owner_user_id = auth.uid()  -- FIXED: using owner_user_id
        )
    )
  );

-- D) Users can leave (delete) their own membership
create policy "cm_delete_self"
  on public.challenge_members
  for delete
  using (user_id = auth.uid());

-- 3) Ensure minimal policies on challenges - FIXED to use owner_user_id

-- Enable RLS if not already
alter table public.challenges enable row level security;

-- Drop existing policies on challenges first
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname='public' and tablename='challenges'
  loop
    execute format('drop policy if exists %I on public.challenges;', p.policyname);
  end loop;
end $$;

-- View public challenges OR ones you created
create policy "challenges_select_public_or_owner"
  on public.challenges
  for select
  using (visibility = 'public' or owner_user_id = auth.uid());

-- Create challenges (must set owner_user_id = auth.uid())
create policy "challenges_insert_owner"
  on public.challenges
  for insert
  with check (owner_user_id = auth.uid());

-- Update/Delete only by owner
create policy "challenges_update_owner"
  on public.challenges
  for update
  using (owner_user_id = auth.uid());

create policy "challenges_delete_owner"
  on public.challenges
  for delete
  using (owner_user_id = auth.uid());

commit;