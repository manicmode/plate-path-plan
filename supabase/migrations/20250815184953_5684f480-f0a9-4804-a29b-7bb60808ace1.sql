-- Fix: ensure_rank20_membership now backfills a missing challenge_id
--      for the caller's existing group (legacy rows), then proceeds
--      with idempotent PCP upsert. Also adds debug logs.

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
  -- Per-user tx lock prevents race across tabs/sessions
  SELECT hashtextextended(auth.uid()::text, 0) INTO v_lock;
  PERFORM pg_advisory_xact_lock(v_lock);

  -- If already a member, reuse that group
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    -- Backfill challenge_id if legacy group has NULL
    SELECT rg.challenge_id INTO v_chal
    FROM public.rank20_groups rg
    WHERE rg.id = v_group
    FOR UPDATE;

    IF v_chal IS NULL THEN
      -- Create a private challenge and attach it to this legacy group
      INSERT INTO public.private_challenges (
        title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
      ) VALUES (
        'Rank of 20 Group (Backfill)',
        'Backfilled private challenge for legacy Rank-of-20 group',
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

      RAISE LOG '[ensure_rank20_membership] Backfilled challenge_id % for legacy group %', v_chal, v_group;
    END IF;

  ELSE
    -- Join most-filled open group (<20), else create new challenge+group
    SELECT g.id, g.challenge_id
      INTO v_group, v_chal
    FROM public.rank20_groups g
    WHERE COALESCE(g.is_closed,false) = false
      AND (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = g.id) < 20
    ORDER BY (SELECT COUNT(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

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
    ELSE
      -- safety: if the picked group somehow had NULL, backfill now
      IF v_chal IS NULL THEN
        INSERT INTO public.private_challenges (
          title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
        ) VALUES (
          'Rank of 20 Group (Backfill)',
          'Backfilled private challenge for legacy Rank-of-20 group',
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
        RAISE LOG '[ensure_rank20_membership] Backfilled challenge_id % for chosen group %', v_chal, v_group;
      END IF;
    END IF;

    -- Enroll caller; single-group rule enforced by unique index on (user_id)
    INSERT INTO public.rank20_members (user_id, group_id, joined_at)
    VALUES (auth.uid(), v_group, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Idempotent PCP upsert (prevents 409)
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
  VALUES (v_chal, auth.uid(), false)
  ON CONFLICT (private_challenge_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_chal;
END;
$$;

ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;