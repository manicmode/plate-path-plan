CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path TO pg_catalog, public
AS $$
DECLARE
  uid uuid; gid uuid; cid uuid; current_cid uuid; current_cat text;
BEGIN
  uid := public._current_user_id();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;

  -- per-user serialization
  IF NOT pg_try_advisory_xact_lock( ('x'||substr(md5(uid::text),1,16))::bit(64)::bigint ) THEN
    RAISE EXCEPTION 'Concurrent membership operation detected, please retry';
  END IF;

  -- Determine the active Arena challenge (rank_of_20)
  SELECT public.my_rank20_chosen_challenge_id() INTO cid;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'No active Arena challenge configured';
  END IF;

  -- Load existing membership (if any) and its category
  SELECT rm.group_id, rg.challenge_id, pc.category
    INTO gid, current_cid, current_cat
  FROM public.rank20_members rm
  JOIN public.rank20_groups rg ON rg.id = rm.group_id
  LEFT JOIN public.private_challenges pc ON pc.id = rg.challenge_id
  WHERE rm.user_id = uid
  LIMIT 1;

  -- If user already in a rank_of_20 group for the active challenge, return it
  IF gid IS NOT NULL AND current_cid = cid THEN
    RETURN QUERY SELECT gid, cid;
    RETURN;
  END IF;

  -- If user is in some other challenge, relocate them to the active rank_of_20 group
  IF gid IS NOT NULL AND (current_cat IS DISTINCT FROM 'rank_of_20' AND current_cat IS DISTINCT FROM 'rank20') THEN
    -- Find an open group for cid
    WITH candidate AS (
      SELECT rg.id
      FROM public.rank20_groups rg
      WHERE COALESCE(rg.is_closed,false)=false AND rg.challenge_id=cid
      FOR UPDATE SKIP LOCKED
    ),
    spot AS (
      SELECT c.id
      FROM candidate c
      JOIN LATERAL (
        SELECT count(*)::int AS member_count
        FROM public.rank20_members rm
        WHERE rm.group_id = c.id
      ) m ON true
      WHERE m.member_count < 20
      ORDER BY m.member_count ASC
      LIMIT 1
    )
    SELECT id INTO gid FROM spot;

    IF gid IS NULL THEN
      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (cid, false)
      RETURNING id INTO gid;
    END IF;

    -- Move membership atomically (unique on user_id enforced)
    UPDATE public.rank20_members
    SET group_id = gid, joined_at = now()
    WHERE user_id = uid;

    RETURN QUERY SELECT gid, cid;
    RETURN;
  END IF;

  -- No membership yet: join/create group for cid
  IF gid IS NULL THEN
    WITH candidate AS (
      SELECT rg.id
      FROM public.rank20_groups rg
      WHERE COALESCE(rg.is_closed,false)=false AND rg.challenge_id=cid
      FOR UPDATE SKIP LOCKED
    ),
    spot AS (
      SELECT c.id
      FROM candidate c
      JOIN LATERAL (
        SELECT count(*)::int AS member_count
        FROM public.rank20_members rm
        WHERE rm.group_id = c.id
      ) m ON true
      WHERE m.member_count < 20
      ORDER BY m.member_count ASC
      LIMIT 1
    )
    SELECT id INTO gid FROM spot;

    IF gid IS NULL THEN
      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (cid, false)
      RETURNING id INTO gid;
    END IF;

    INSERT INTO public.rank20_members (group_id, user_id, joined_at)
    VALUES (gid, uid, now())
    ON CONFLICT (user_id) DO UPDATE SET group_id = EXCLUDED.group_id, joined_at = now();

    RETURN QUERY SELECT gid, cid;
    RETURN;
  END IF;

  -- Fallback: user had a membership but not in the active Arena challenge; if we got here,
  -- treat as relocate to the active challenge
  UPDATE public.rank20_members
  SET group_id = (SELECT id FROM public.rank20_groups WHERE challenge_id=cid AND COALESCE(is_closed,false)=false LIMIT 1)
  WHERE user_id = uid;

  IF NOT FOUND THEN
    INSERT INTO public.rank20_groups (challenge_id, is_closed)
    VALUES (cid, false)
    RETURNING id INTO gid;
    UPDATE public.rank20_members SET group_id = gid, joined_at = now() WHERE user_id = uid;
  END IF;

  -- Return final state
  SELECT rm.group_id, rg.challenge_id INTO gid, cid
  FROM public.rank20_members rm JOIN public.rank20_groups rg ON rg.id = rm.group_id
  WHERE rm.user_id = uid LIMIT 1;

  RETURN QUERY SELECT gid, cid;
END
$$;
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated;