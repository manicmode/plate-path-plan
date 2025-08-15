-- Fix 409 conflicts & stabilize membership
-- Goal: Eliminate 409 errors on send by making auto-enrollment fully idempotent and race-proof

-- 1) Ensure unique key exists for PCP (safe if it already exists)
CREATE UNIQUE INDEX IF NOT EXISTS ux_pcp_chal_user
ON public.private_challenge_participations (private_challenge_id, user_id);

-- 2) Replace ensure_rank20_membership with ON CONFLICT for PCP (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_chal  uuid;
  v_lock  bigint;
BEGIN
  -- Per-user tx advisory lock prevents race across tabs
  SELECT hashtextextended(auth.uid()::text, 0) INTO v_lock;
  PERFORM pg_advisory_xact_lock(v_lock);

  -- If already a member, reuse
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NULL THEN
    -- Join most-filled open group (<20)
    SELECT g.id, g.challenge_id
      INTO v_group, v_chal
    FROM public.rank20_groups g
    WHERE COALESCE(g.is_closed,false) = false
      AND (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = g.id) < 20
    ORDER BY (SELECT COUNT(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    -- If none, create new challenge + group
    IF v_group IS NULL THEN
      INSERT INTO public.private_challenges
        (title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants)
      VALUES
        ('Rank of 20 Group', 'Automated Rank of 20 challenge group', 'rank_of_20',
         auth.uid(), 'active', CURRENT_DATE, 30, 20)
      RETURNING id INTO v_chal;

      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (v_chal, false)
      RETURNING id INTO v_group;
    ELSE
      SELECT challenge_id INTO v_chal FROM public.rank20_groups WHERE id = v_group;
    END IF;

    -- Enroll caller; single-group rule enforced by unique index on (user_id)
    INSERT INTO public.rank20_members (user_id, group_id, joined_at)
    VALUES (auth.uid(), v_group, now())
    ON CONFLICT (user_id) DO NOTHING;

  ELSE
    SELECT challenge_id INTO v_chal FROM public.rank20_groups WHERE id = v_group;
  END IF;

  -- **Idempotent upsert** for PCP (prevents 409 under race)
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
  VALUES (v_chal, auth.uid(), false)
  ON CONFLICT (private_challenge_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_chal;
END;
$$;

ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;