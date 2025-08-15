-- DEV RESET for the current user
-- Clears MY participations and related billboard/chat rows (private+public),
-- then deletes orphaned PRIVATE challenges that I was in.
BEGIN;

-- 0) Snapshot MY current participations into temp tables
CREATE TEMP TABLE my_pvt_challenges ON COMMIT DROP AS
  SELECT p.private_challenge_id AS id
  FROM public.private_challenge_participations p
  WHERE p.user_id = auth.uid();

CREATE TEMP TABLE my_pub_challenges ON COMMIT DROP AS
  SELECT p.challenge_id AS id
  FROM public.public_challenge_participations p
  WHERE p.user_id = auth.uid();

-- 1) Delete billboard/chat rows for those challenges (tables may not exist in dev)
DO $$
BEGIN
  IF to_regclass('public.billboard_events') IS NOT NULL THEN
    DELETE FROM public.billboard_events
    WHERE (challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (challenge_id IN (SELECT id FROM my_pub_challenges));
  END IF;

  IF to_regclass('public.billboard_comments') IS NOT NULL THEN
    DELETE FROM public.billboard_comments
    WHERE (event_id IN (
      SELECT e.id FROM public.billboard_events e
      WHERE (e.challenge_id IN (SELECT id FROM my_pvt_challenges))
         OR (e.challenge_id IN (SELECT id FROM my_pub_challenges))
    ));
  END IF;

  IF to_regclass('public.billboard_reactions') IS NOT NULL THEN
    DELETE FROM public.billboard_reactions
    WHERE (event_id IN (
      SELECT e.id FROM public.billboard_events e
      WHERE (e.challenge_id IN (SELECT id FROM my_pvt_challenges))
         OR (e.challenge_id IN (SELECT id FROM my_pub_challenges))
    ));
  END IF;

  -- If you have a chat table, clean it too (safe no-op if absent)
  IF to_regclass('public.challenge_messages') IS NOT NULL THEN
    DELETE FROM public.challenge_messages
    WHERE (challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (challenge_id IN (SELECT id FROM my_pub_challenges));
  END IF;
END $$;

-- 2) Remove MY participations (visible cleanup in UI)
DELETE FROM public.private_challenge_participations
WHERE user_id = auth.uid();

DELETE FROM public.public_challenge_participations
WHERE user_id = auth.uid();

-- 3) Delete orphaned PRIVATE challenges that I was part of
--    (only those from my_pvt_challenges, and only if they now have zero members)
DELETE FROM public.private_challenges pc
USING my_pvt_challenges t
WHERE pc.id = t.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.private_challenge_participations p
    WHERE p.private_challenge_id = pc.id
  );

COMMIT;