-- Case-insensitive domain filter RPCs
create or replace function public.my_private_challenges_by_domain(_domain text)
returns table(id uuid, title text, category text, created_at timestamptz)
language sql
security definer
set search_path=public,pg_catalog
as $$
  select pc.id, pc.title, pc.category, pc.created_at
  from public.private_challenges pc
  join public.private_challenge_participations p
    on p.private_challenge_id = pc.id
  where p.user_id = auth.uid()
    and (_domain is null or lower(pc.category) = lower(_domain));
$$;

create or replace function public.my_public_challenges_by_domain(_domain text)
returns table(id uuid, title text, category text, created_at timestamptz)
language sql
security definer
set search_path=public,pg_catalog
as $$
  select c.id, c.title, c.category, c.created_at
  from public.public_challenges c
  join public.public_challenge_participations p
    on p.challenge_id = c.id
  where p.user_id = auth.uid()
    and (_domain is null or lower(c.category) = lower(_domain));
$$;

-- Clean slate script - exactly as requested
BEGIN;

-- 0) Resolve my UID (works in SQL Editor even if auth.uid() is null)
create temp table me(uid uuid) on commit drop;
insert into me(uid)
select coalesce(
  nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
  (select id from auth.users order by last_sign_in_at desc nulls last limit 1)
);

-- 1) Snapshot the challenge ids I'm in
create temp table my_pvt on commit drop as
  select private_challenge_id as id
  from public.private_challenge_participations p, me
  where p.user_id = me.uid;

create temp table my_pub on commit drop as
  select challenge_id as id
  from public.public_challenge_participations p, me
  where p.user_id = me.uid;

-- 2) Snapshot the billboard event ids tied to *my* challenges
create temp table my_event_ids on commit drop as
  select id
  from public.billboard_events
  where challenge_id in (select id from my_pvt)
     or challenge_id in (select id from my_pub);

-- 3) Delete reactions/comments for *my* events, then delete those events.
DO $$
BEGIN
  IF to_regclass('public.billboard_reactions') IS NOT NULL THEN
    DELETE FROM public.billboard_reactions
    WHERE event_id IN (SELECT id FROM my_event_ids);
  END IF;

  IF to_regclass('public.billboard_comments') IS NOT NULL THEN
    DELETE FROM public.billboard_comments
    WHERE event_id IN (SELECT id FROM my_event_ids);
  END IF;

  IF to_regclass('public.challenge_messages') IS NOT NULL THEN
    DELETE FROM public.challenge_messages
    WHERE challenge_id IN (SELECT id FROM my_pvt)
       OR challenge_id IN (SELECT id FROM my_pub);
  END IF;

  IF to_regclass('public.billboard_events') IS NOT NULL THEN
    DELETE FROM public.billboard_events
    WHERE id IN (SELECT id FROM my_event_ids);
  END IF;
END $$;

-- 4) Remove MY participations
DELETE FROM public.private_challenge_participations
WHERE user_id = (SELECT uid FROM me);

DELETE FROM public.public_challenge_participations
WHERE user_id = (SELECT uid FROM me);

-- 5) DEV clean slate: delete the challenges I was in
DELETE FROM public.private_challenges
WHERE id IN (SELECT id FROM my_pvt);

DELETE FROM public.public_challenges
WHERE id IN (SELECT id FROM my_pub);

COMMIT;

-- Sanity: show who we cleaned + zero participations
SELECT 'CLEANED_USER' AS label, (SELECT uid FROM me) AS user_id;
SELECT count(*) AS my_pvt_after FROM public.private_challenge_participations WHERE user_id = (SELECT uid FROM me);
SELECT count(*) AS my_pub_after FROM public.public_challenge_participations  WHERE user_id = (SELECT uid FROM me);