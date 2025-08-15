-- ✅ Rank-of-20 Arena: safe backfill + authenticated smoke test
-- Works without auth.users access. Uses real group members only.

-- -------------------------------------------------------------------
-- F. SAFER BULK BACKFILL FIRST (no auth.uid() dependency)
-- -------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  v_chal uuid;
  v_creator uuid;
BEGIN
  FOR rec IN
    SELECT id FROM public.rank20_groups WHERE challenge_id IS NULL
  LOOP
    -- Earliest member becomes creator for the new private_challenges row
    SELECT rm.user_id
      INTO v_creator
    FROM public.rank20_members rm
    WHERE rm.group_id = rec.id
    ORDER BY rm.joined_at ASC NULLS LAST
    LIMIT 1;

    -- No members? Skip quietly.
    IF v_creator IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.private_challenges (
      title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
    ) VALUES (
      'Rank of 20 Group (Bulk Backfill)',
      'Backfilled private challenge for legacy Rank-of-20 group',
      'rank_of_20',
      v_creator,    -- ✅ valid FK to auth.users
      'active',
      CURRENT_DATE,
      30,
      20
    )
    RETURNING id INTO v_chal;

    UPDATE public.rank20_groups
    SET challenge_id = v_chal
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Re-check legacy groups
SELECT COUNT(*) AS groups_with_null_challenge_after
FROM public.rank20_groups
WHERE challenge_id IS NULL;

-- -------------------------------------------------------------------
-- 0. Pick a real user and set a session JWT sub so auth.uid() works
-- -------------------------------------------------------------------
-- Prefer a Rank-of-20 member; if none exist, this will be NULL and the next
-- steps will simply no-op with clear errors in the results.
SELECT set_config(
  'request.jwt.claim.sub',
  (SELECT user_id::text FROM public.rank20_members ORDER BY joined_at DESC LIMIT 1),
  false  -- persist for the session, not just local tx
) AS jwt_user_applied;

-- -------------------------------------------------------------------
-- A. Ensure/Backfill membership for the caller and show IDs
-- -------------------------------------------------------------------
SELECT * FROM public.ensure_rank20_membership();

-- -------------------------------------------------------------------
-- B. Resolve challenge from rank20_members -> rank20_groups (no PCP dep.)
-- -------------------------------------------------------------------
SELECT * FROM public.my_rank20_chosen_challenge_id();

-- -------------------------------------------------------------------
-- C. Try a real insert via the RPC (should return a UUID)
-- -------------------------------------------------------------------
SELECT public.arena_post_message('healthcheck ✅ ' || now()::text) AS new_message_id;

-- -------------------------------------------------------------------
-- D. Read back the last 5 messages for my challenge (proves persistence)
-- -------------------------------------------------------------------
WITH mg AS (
  SELECT rg.id AS group_id, rg.challenge_id
  FROM public.rank20_members rm
  JOIN public.rank20_groups  rg ON rg.id = rm.group_id
  WHERE rm.user_id = current_setting('request.jwt.claim.sub')::uuid
  LIMIT 1
)
SELECT id, left(body,80) AS body, created_at
FROM public.rank20_chat_messages
WHERE challenge_id = (SELECT challenge_id FROM mg)
ORDER BY created_at DESC
LIMIT 5;