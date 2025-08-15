BEGIN;

CREATE TEMP TABLE my_pvt_challenges ON COMMIT DROP AS
  SELECT DISTINCT p.private_challenge_id AS id
  FROM public.private_challenge_participations p
  WHERE p.user_id = auth.uid();

CREATE TEMP TABLE my_pub_challenges ON COMMIT DROP AS
  SELECT DISTINCT p.challenge_id AS id
  FROM public.public_challenge_participations p
  WHERE p.user_id = auth.uid();

DO $$
BEGIN
  IF to_regclass('public.billboard_events') IS NOT NULL THEN
    DELETE FROM public.billboard_events
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (public_challenge_id  IN (SELECT id FROM my_pub_challenges))
       OR (challenge_id         IN (SELECT id FROM my_pub_challenges));
  END IF;

  IF to_regclass('public.billboard_comments') IS NOT NULL THEN
    DELETE FROM public.billboard_comments
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (public_challenge_id  IN (SELECT id FROM my_pub_challenges))
       OR (challenge_id         IN (SELECT id FROM my_pub_challenges));
  END IF;

  IF to_regclass('public.billboard_reactions') IS NOT NULL THEN
    DELETE FROM public.billboard_reactions
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (public_challenge_id  IN (SELECT id FROM my_pub_challenges))
       OR (challenge_id         IN (SELECT id FROM my_pub_challenges));
  END IF;

  IF to_regclass('public.challenge_messages') IS NOT NULL THEN
    DELETE FROM public.challenge_messages
    WHERE (private_challenge_id IN (SELECT id FROM my_pvt_challenges))
       OR (public_challenge_id  IN (SELECT id FROM my_pub_challenges))
       OR (challenge_id         IN (SELECT id FROM my_pub_challenges));
  END IF;
END $$;

DELETE FROM public.private_challenge_participations
WHERE user_id = auth.uid();

DELETE FROM public.public_challenge_participations
WHERE user_id = auth.uid();

-- Remove ALL private/public challenges I was in
DELETE FROM public.private_challenges
WHERE id IN (SELECT id FROM my_pvt_challenges);

DELETE FROM public.public_challenges
WHERE id IN (SELECT id FROM my_pub_challenges);

COMMIT;