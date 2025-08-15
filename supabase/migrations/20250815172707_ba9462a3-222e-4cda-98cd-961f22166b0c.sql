-- =========================================================
-- 0) Preconditions: enable RLS on PCP if not already
-- =========================================================
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 1) Ensure membership: VOLATILE + advisory lock + PCP ensure
-- =========================================================
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
  v_lock_key bigint;
BEGIN
  -- Per-user tx lock (no pgcrypto)
  SELECT hashtextextended(auth.uid()::text, 0) INTO v_lock_key;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Already a member? return it and ensure PCP
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    SELECT rg.challenge_id INTO v_challenge
    FROM public.rank20_groups rg
    WHERE rg.id = v_group;

    IF v_challenge IS NOT NULL THEN
      INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
      SELECT v_challenge, auth.uid(), false
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.private_challenge_participations p
        WHERE p.private_challenge_id = v_challenge
          AND p.user_id = auth.uid()
      );
    END IF;

    RETURN QUERY SELECT v_group, v_challenge;
    RETURN;
  END IF;

  -- Join the most-filled open group with < 20 members (NULL-safe is_closed)
  SELECT g.id, g.challenge_id
    INTO v_group, v_challenge
  FROM public.rank20_groups g
  WHERE COALESCE(g.is_closed, false) = false
    AND (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = g.id) < 20
  ORDER BY (SELECT COUNT(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- If none, create challenge + group
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
    )
    RETURNING id INTO v_challenge;

    INSERT INTO public.rank20_groups (challenge_id, is_closed)
    VALUES (v_challenge, false)
    RETURNING id INTO v_group;
  END IF;

  -- Enroll caller (idempotent)
  INSERT INTO public.rank20_members (user_id, group_id, joined_at)
  VALUES (auth.uid(), v_group, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure PCP for this challenge (idempotent)
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
  SELECT v_challenge, auth.uid(), false
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.private_challenge_participations p
    WHERE p.private_challenge_id = v_challenge
      AND p.user_id = auth.uid()
  );

  RETURN QUERY SELECT v_group, v_challenge;
END;
$$;

ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

-- =========================================================
-- 2) Message RPC: VOLATILE + membership-aware insert
-- =========================================================
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
  v_id uuid;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message body is empty';
  END IF;

  SELECT group_id, challenge_id
  INTO v_group, v_challenge
  FROM public.ensure_rank20_membership();

  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
  VALUES (v_challenge, auth.uid(), p_content)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;

-- =========================================================
-- 3) Challenge resolver without PCP dependency
-- =========================================================
CREATE OR REPLACE FUNCTION public.my_rank20_chosen_challenge_id()
RETURNS TABLE(private_challenge_id uuid, member_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH mg AS (
    SELECT rg.id AS group_id, rg.challenge_id
    FROM public.rank20_members rm
    JOIN public.rank20_groups rg ON rg.id = rm.group_id
    WHERE rm.user_id = auth.uid()
    LIMIT 1
  )
  SELECT
    mg.challenge_id AS private_challenge_id,
    (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = mg.group_id) AS member_count
  FROM mg;
$$;

ALTER FUNCTION public.my_rank20_chosen_challenge_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id() TO authenticated, service_role;

-- =========================================================
-- 4) RLS for PCP so inserts/reads don't get blocked
-- =========================================================
DROP POLICY IF EXISTS pcp_select_mine ON public.private_challenge_participations;
DROP POLICY IF EXISTS pcp_insert_mine ON public.private_challenge_participations;

CREATE POLICY pcp_select_mine
ON public.private_challenge_participations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY pcp_insert_mine
ON public.private_challenge_participations
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    WHERE pc.id = private_challenge_participations.private_challenge_id
      AND pc.challenge_type = 'rank_of_20'
  )
);

-- =========================================================
-- 5) (Optional) Helpful indexes (guards)
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_r20_members_group ON public.rank20_members(group_id);
CREATE INDEX IF NOT EXISTS idx_r20_groups_open ON public.rank20_groups(is_closed);
CREATE INDEX IF NOT EXISTS idx_r20_chat_msgs_chal_created ON public.rank20_chat_messages(challenge_id, created_at DESC);