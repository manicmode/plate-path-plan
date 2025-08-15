-- ------------------------------------------------------------
-- 1) Harden ensure_rank20_membership against orphaned challenges
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_chal  uuid;
  v_lock  bigint;
BEGIN
  -- Per-user tx lock (robust even if auth.uid() is null in some tools)
  SELECT hashtextextended(COALESCE(current_setting('request.jwt.claim.sub', true),
                                   auth.uid()::text,
                                   'anon'), 0)
  INTO v_lock;
  PERFORM pg_advisory_xact_lock(v_lock);

  -- If already a member, reuse that group
  SELECT rm.group_id
    INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    -- Fetch and lock the group's challenge_id
    SELECT rg.challenge_id
      INTO v_chal
    FROM public.rank20_groups rg
    WHERE rg.id = v_group
    FOR UPDATE;

    -- Backfill if NULL or orphaned
    IF v_chal IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.private_challenges pc WHERE pc.id = v_chal)
    THEN
      INSERT INTO public.private_challenges (
        title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
      ) VALUES (
        'Rank of 20 Group (Auto Backfill)',
        'Auto-generated private challenge for Rank-of-20 group',
        'rank_of_20',
        auth.uid(),
        'active',
        CURRENT_DATE,
        30,
        20
      ) RETURNING id INTO v_chal;

      UPDATE public.rank20_groups
      SET challenge_id = v_chal
      WHERE id = v_group;

      RAISE LOG '[ensure_rank20_membership] Backfilled challenge_id % for group %', v_chal, v_group;
    END IF;

  ELSE
    -- Try to join an open group whose challenge exists
    SELECT g.id, g.challenge_id
      INTO v_group, v_chal
    FROM public.rank20_groups g
    JOIN public.private_challenges pc ON pc.id = g.challenge_id     -- ensures challenge exists
    WHERE COALESCE(g.is_closed,false) = false
      AND (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = g.id) < 20
    ORDER BY (SELECT COUNT(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    -- If none, create new challenge + group
    IF v_group IS NULL THEN
      INSERT INTO public.private_challenges (
        title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
      ) VALUES (
        'Rank of 20 Group',
        'Automated Rank of 20 challenge group',
        'rank_of_20',
        auth.uid(),
        'active',
        CURRENT_DATE,
        30,
        20
      ) RETURNING id INTO v_chal;

      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (v_chal, false)
      RETURNING id INTO v_group;
    END IF;

    -- Enroll caller (unique on user_id makes this idempotent)
    INSERT INTO public.rank20_members (user_id, group_id, joined_at)
    VALUES (auth.uid(), v_group, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Idempotent PCP upsert (FK-safe because v_chal is guaranteed valid now)
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
  VALUES (v_chal, auth.uid(), false)
  ON CONFLICT (private_challenge_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_chal;
END;
$$;

ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

-- ------------------------------------------------------------
-- 2) One-time repair sweep for ALL legacy/orphaned groups
-- ------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  v_chal uuid;
  v_creator uuid;
BEGIN
  FOR rec IN
    SELECT g.id,
           (SELECT rm.user_id
              FROM public.rank20_members rm
             WHERE rm.group_id = g.id
             ORDER BY rm.joined_at ASC NULLS LAST
             LIMIT 1) AS creator_id
      FROM public.rank20_groups g
 LEFT JOIN public.private_challenges pc ON pc.id = g.challenge_id
     WHERE g.challenge_id IS NULL
        OR pc.id IS NULL
  LOOP
    -- skip truly empty groups (no members)
    IF rec.creator_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.private_challenges (
      title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
    ) VALUES (
      'Rank of 20 Group (Bulk Backfill)',
      'Backfilled private challenge for legacy Rank-of-20 group',
      'rank_of_20',
      rec.creator_id,
      'active',
      CURRENT_DATE,
      30,
      20
    ) RETURNING id INTO v_chal;

    UPDATE public.rank20_groups
       SET challenge_id = v_chal
     WHERE id = rec.id;
  END LOOP;
END $$;

-- quick check
SELECT COUNT(*) AS groups_with_null_or_orphaned_challenge_after
FROM public.rank20_groups g
LEFT JOIN public.private_challenges pc ON pc.id = g.challenge_id
WHERE g.challenge_id IS NULL OR pc.id IS NULL;

-- ------------------------------------------------------------
-- 3) Smoke test (set a real user; ensure; post; read)
-- ------------------------------------------------------------
-- pick a real rank20 member for this session so auth.uid() works here
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.rank20_members ORDER BY joined_at DESC LIMIT 1),
  false
) AS jwt_user_applied;

-- ensure/backfill for the chosen user
SELECT * FROM public.ensure_rank20_membership();

-- resolve challenge (no PCP dependency)
SELECT * FROM public.my_rank20_chosen_challenge_id();

-- send a test message (returns UUID)
SELECT public.arena_post_message('healthcheck ✅ ' || now()::text) AS new_message_id;

-- read back 5 recent for my challenge
WITH mg AS (
  SELECT rg.id AS group_id, rg.challenge_id
  FROM public.rank20_members rm
  JOIN public.rank20_groups  rg ON rg.id = rm.group_id
  WHERE rm.user_id = current_setting('request.jwt.claim.sub')::uuid
  LIMIT 1
)
SELECT id, LEFT(body,80) AS body, created_at
FROM public.rank20_chat_messages
WHERE challenge_id = (SELECT challenge_id FROM mg)
ORDER BY created_at DESC
LIMIT 5;