-- DEV RESET for the current user
-- Safely clear my participations and related billboard/chat rows,
-- then remove orphaned private challenges that I was part of.

BEGIN;

-- Capture my user id once
WITH me AS (SELECT auth.uid() AS uid),

-- Collect the challenge ids I currently participate in
my_pvt AS (
  SELECT p.private_challenge_id AS id
  FROM public.private_challenge_participations p, me
  WHERE p.user_id = me.uid
),
my_pub AS (
  SELECT p.public_challenge_id AS id
  FROM public.public_challenge_participations p, me
  WHERE p.user_id = me.uid
)

-- 1) Delete billboard/chat rows for those challenges (if those tables exist)
-- We use plpgsql blocks so this runs even if a table is missing in dev.
;

DO $$
BEGIN
  IF to_regclass('public.billboard_events') IS NOT NULL THEN
    DELETE FROM public.billboard_events
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt))
       OR (public_challenge_id  IN (SELECT id FROM my_pub));
  END IF;

  IF to_regclass('public.billboard_comments') IS NOT NULL THEN
    DELETE FROM public.billboard_comments
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt))
       OR (public_challenge_id  IN (SELECT id FROM my_pub));
  END IF;

  IF to_regclass('public.billboard_reactions') IS NOT NULL THEN
    DELETE FROM public.billboard_reactions
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt))
       OR (public_challenge_id  IN (SELECT id FROM my_pub));
  END IF;
END $$;

-- 2) Remove MY participations (this is the visible cleanup in the UI)
DELETE FROM public.private_challenge_participations
WHERE user_id = auth.uid();

DELETE FROM public.public_challenge_participations
WHERE user_id = auth.uid();

-- 3) Delete orphaned PRIVATE challenges that I was part of
--    (only those from my_pvt, and only if they now have zero members)
DELETE FROM public.private_challenges pc
USING my_pvt
WHERE pc.id = my_pvt.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.private_challenge_participations p
    WHERE p.private_challenge_id = pc.id
  );

COMMIT;

-- Optional sanity checks for my user (should return 0 rows)
-- SELECT * FROM public.private_challenge_participations WHERE user_id = auth.uid();
-- SELECT * FROM public.public_challenge_participations  WHERE user_id = auth.uid();