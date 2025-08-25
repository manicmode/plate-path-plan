-- ============================================================================
-- SECURITY PATCH: lock down habit templates + premium meditation content
-- Safe to re-run (idempotent). No UI changes required.
-- ============================================================================

-- ---------- Helpers ----------
create schema if not exists authx;

-- Premium check function - currently returns false but can be updated when premium is implemented
create or replace function authx.is_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  -- For now, return false until premium is implemented in user_profiles
  -- This can be updated later to check a premium column when added
  select false;
$$;

grant execute on function authx.is_premium(uuid) to authenticated, service_role;

-- ---------- A) HABIT TEMPLATES ----------
-- Tables: public.habit_template (and optional view public.habit_templates)

-- RLS on base table
alter table if exists public.habit_template enable row level security;

-- Add is_public to support free templates (if missing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='habit_template' and column_name='is_public'
  ) then
    alter table public.habit_template add column is_public boolean default false;
    update public.habit_template set is_public = false where is_public is null;
  end if;
end $$;

-- Remove overly-permissive policies / grants
drop policy if exists habit_template_public_read on public.habit_template;
revoke select on table public.habit_template from anon;

-- If a public view was created and granted to anon, revoke/downgrade it
do $$
begin
  if exists (select 1 from pg_views where schemaname='public' and viewname='habit_templates') then
    revoke select on table public.habit_templates from anon;
    grant  select on table public.habit_templates to authenticated;
  end if;
exception when undefined_table then
  null;
end $$;

-- Secure read policy: explicitly public OR premium users (habit_template has no user_id)
drop policy if exists habit_template_secure_read on public.habit_template;
create policy habit_template_secure_read
on public.habit_template
for select
to authenticated
using (
  (coalesce(is_public,false) = true)
  or authx.is_premium(auth.uid())
);

-- ---------- B) MEDITATION SESSIONS + AUDIO ----------
-- Table: public.meditation_sessions (assumed columns: id, title, audio_url, …)

alter table if exists public.meditation_sessions enable row level security;

-- Add is_free + audio_path (internal path in storage) if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='meditation_sessions' and column_name='is_free'
  ) then
    alter table public.meditation_sessions add column is_free boolean default false;
    update public.meditation_sessions set is_free = false where is_free is null;
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='meditation_sessions' and column_name='audio_path'
  ) then
    alter table public.meditation_sessions add column audio_path text;
    -- (Optional) best-effort migration from /audio/foo.mp3 to just 'foo.mp3'
    update public.meditation_sessions
      set audio_path = regexp_replace(coalesce(audio_url,''), '^/?audio/','')
    where audio_path is null and audio_url is not null;
  end if;
end $$;

-- Remove "anyone can view" and lock to authenticated + entitlement
drop policy if exists "Anyone can view meditation sessions" on public.meditation_sessions;
drop policy if exists meditation_sessions_read_secure on public.meditation_sessions;

create policy meditation_sessions_read_secure
on public.meditation_sessions
for select
to authenticated
using (
  is_free = true
  or authx.is_premium(auth.uid())
);

-- ---------- C) STORAGE: private bucket + policies for signed URLs ----------
-- Private bucket for meditation audio (idempotent)
insert into storage.buckets (id, name, public)
values ('meditation-audio','meditation-audio', false)
on conflict (id) do nothing;

-- Deny bucket publicness if it ever flipped
update storage.buckets set public=false where id='meditation-audio';

-- Policies: allow entitled users to "select" objects (needed for createSignedUrl)
-- 1) Premium users can access any audio in the bucket
drop policy if exists med_audio_premium_select on storage.objects;
create policy med_audio_premium_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meditation-audio'
  and authx.is_premium(auth.uid())
);

-- 2) Free sessions' audio is allowed for all authenticated users
drop policy if exists med_audio_free_select on storage.objects;
create policy med_audio_free_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'meditation-audio'
  and exists (
        select 1
          from public.meditation_sessions s
         where s.audio_path = storage.objects.name
           and s.is_free = true
      )
);

-- Harden: no anon access to the bucket
revoke all on storage.objects from anon;