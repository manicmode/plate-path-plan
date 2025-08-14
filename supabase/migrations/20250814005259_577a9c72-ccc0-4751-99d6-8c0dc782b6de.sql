-- Replace the hard-coded cleanup with an idempotent, self-contained version
CREATE OR REPLACE FUNCTION public.cleanup_rank20_dupes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  canonical_group_id uuid;
  canonical_batch bigint;
  canonical_challenge_id uuid;

  del_memberships int := 0;
  del_participations int := 0;
  del_groups int := 0;
  del_challenges int := 0;

BEGIN
  -- Pick the canonical Rank-of-20 group as the earliest open/linked group
  SELECT g.id, g.batch_number, g.challenge_id
    INTO canonical_group_id, canonical_batch, canonical_challenge_id
  FROM public.rank20_groups g
  JOIN public.private_challenges pc ON pc.id = g.challenge_id
  WHERE pc.challenge_type = 'rank_of_20'
  ORDER BY g.batch_number ASC
  LIMIT 1;

  IF canonical_group_id IS NULL THEN
    -- Nothing to do (no rank20 groups/challenges)
    RETURN jsonb_build_object(
      'status','no_rank20_found',
      'deleted_memberships',0,
      'deleted_participations',0,
      'deleted_groups',0,
      'deleted_challenges',0
    );
  END IF;

  -- 1) Remove extra memberships for ANY user where they are in rank20 groups
  --    other than the canonical group.
  WITH extras AS (
    SELECT rm.group_id, rm.user_id
    FROM public.rank20_members rm
    JOIN public.rank20_groups g ON g.id = rm.group_id
    JOIN public.private_challenges pc ON pc.id = g.challenge_id
    WHERE pc.challenge_type = 'rank_of_20'
      AND rm.group_id <> canonical_group_id
  )
  DELETE FROM public.rank20_members rm
  USING extras e
  WHERE rm.group_id = e.group_id AND rm.user_id = e.user_id;

  GET DIAGNOSTICS del_memberships = ROW_COUNT;

  -- 2) Remove extra participations for ANY user in rank20 challenges
  --    other than the canonical challenge.
  WITH extras AS (
    SELECT p.private_challenge_id, p.user_id
    FROM public.private_challenge_participations p
    JOIN public.private_challenges pc ON pc.id = p.private_challenge_id
    WHERE pc.challenge_type = 'rank_of_20'
      AND p.private_challenge_id <> canonical_challenge_id
  )
  DELETE FROM public.private_challenge_participations p
  USING extras e
  WHERE p.private_challenge_id = e.private_challenge_id AND p.user_id = e.user_id;

  GET DIAGNOSTICS del_participations = ROW_COUNT;

  -- 3) Delete now-empty stray rank20 groups (not the canonical)
  WITH to_delete AS (
    SELECT g.id
    FROM public.rank20_groups g
    LEFT JOIN public.rank20_members m ON m.group_id = g.id
    JOIN public.private_challenges pc ON pc.id = g.challenge_id
    WHERE pc.challenge_type = 'rank_of_20'
      AND g.id <> canonical_group_id
    GROUP BY g.id
    HAVING COUNT(m.user_id) = 0
  )
  DELETE FROM public.rank20_groups g
  USING to_delete d
  WHERE g.id = d.id;

  GET DIAGNOSTICS del_groups = ROW_COUNT;

  -- 4) Delete orphaned rank20 challenges (no participations) that are not canonical
  WITH to_delete AS (
    SELECT pc.id
    FROM public.private_challenges pc
    LEFT JOIN public.private_challenge_participations p ON p.private_challenge_id = pc.id
    WHERE pc.challenge_type = 'rank_of_20'
      AND pc.id <> canonical_challenge_id
    GROUP BY pc.id
    HAVING COUNT(p.user_id) = 0
  )
  DELETE FROM public.private_challenges pc
  USING to_delete d
  WHERE pc.id = d.id;

  GET DIAGNOSTICS del_challenges = ROW_COUNT;

  RETURN jsonb_build_object(
    'status','ok',
    'canonical_group_id', canonical_group_id,
    'canonical_batch', canonical_batch,
    'canonical_challenge_id', canonical_challenge_id,
    'deleted_memberships', del_memberships,
    'deleted_participations', del_participations,
    'deleted_groups', del_groups,
    'deleted_challenges', del_challenges
  );
END;
$$;

-- Run it and paste the JSON result
SELECT public.cleanup_rank20_dupes();

-- Verify post-cleanup (paste results)
SELECT rm.user_id, rm.group_id, rg.batch_number, rg.challenge_id
FROM public.rank20_members rm
JOIN public.rank20_groups rg ON rg.id = rm.group_id
ORDER BY rm.user_id;

SELECT p.user_id, p.private_challenge_id, pc.title, pc.challenge_type
FROM public.private_challenge_participations p
JOIN public.private_challenges pc ON pc.id = p.private_challenge_id
WHERE pc.challenge_type = 'rank_of_20'
ORDER BY p.user_id;