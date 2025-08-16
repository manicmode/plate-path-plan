-- Arena auto-enroll + vacancy backfill system

-- 1) Keep rank20_groups.is_closed in sync automatically
CREATE OR REPLACE FUNCTION public._rank20_sync_group_flag(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE v_count int;
BEGIN
  IF p_group_id IS NULL THEN RETURN; END IF;
  SELECT count(*)::int INTO v_count FROM public.rank20_members WHERE group_id = p_group_id;
  UPDATE public.rank20_groups
  SET is_closed = (v_count >= 20)
  WHERE id = p_group_id;
END $$;
ALTER FUNCTION public._rank20_sync_group_flag(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._rank20_sync_group_flag(uuid) FROM PUBLIC;

-- Trigger: after membership changes, sync flags for affected groups
CREATE OR REPLACE FUNCTION public._rank20_members_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  PERFORM public._rank20_sync_group_flag(COALESCE(NEW.group_id, OLD.group_id));
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    PERFORM public._rank20_sync_group_flag(OLD.group_id);
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    PERFORM public._rank20_sync_group_flag(NEW.group_id);
  END IF;
  RETURN NULL;
END $$;
ALTER FUNCTION public._rank20_members_after_change() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._rank20_members_after_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_rank20_members_after_change ON public.rank20_members;
CREATE TRIGGER trg_rank20_members_after_change
AFTER INSERT OR UPDATE OF group_id OR DELETE ON public.rank20_members
FOR EACH ROW EXECUTE FUNCTION public._rank20_members_after_change();

-- 2) Ensure unique membership per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_rank20_members_user_unique ON public.rank20_members(user_id);

-- 3) Update ensure_rank20_membership() to be vacancy-first & race-safe
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path TO pg_catalog, public
AS $$
DECLARE
  uid uuid; gid uuid; cid uuid;
BEGIN
  uid := public._current_user_id();
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;

  IF NOT pg_try_advisory_xact_lock( ('x'||substr(md5(uid::text),1,16))::bit(64)::bigint ) THEN
    RAISE EXCEPTION 'Concurrent membership operation detected, please retry';
  END IF;

  -- Always target active Arena challenge
  SELECT public._active_rank20_challenge_id() INTO cid;
  IF cid IS NULL THEN RAISE EXCEPTION 'No active Arena challenge configured'; END IF;

  -- If user already aligned to active challenge, return it
  SELECT rg.id INTO gid
  FROM public.rank20_members rm
  JOIN public.rank20_groups rg ON rg.id = rm.group_id
  WHERE rm.user_id = uid AND rg.challenge_id = cid
  LIMIT 1;
  IF gid IS NOT NULL THEN
    RETURN QUERY SELECT gid, cid; RETURN;
  END IF;

  -- Find vacancy in oldest groups first (any group with <20)
  WITH g AS (
    SELECT rg.id
    FROM public.rank20_groups rg
    WHERE rg.challenge_id = cid
    ORDER BY rg.created_at ASC NULLS LAST, rg.id ASC
    FOR UPDATE SKIP LOCKED
  ),
  spot AS (
    SELECT g.id
    FROM g
    JOIN LATERAL (
      SELECT count(*)::int AS member_count
      FROM public.rank20_members rm
      WHERE rm.group_id = g.id
    ) m ON true
    WHERE m.member_count < 20
    LIMIT 1
  )
  SELECT id INTO gid FROM spot;

  -- If no vacancy, create a new open group
  IF gid IS NULL THEN
    INSERT INTO public.rank20_groups (challenge_id, is_closed)
    VALUES (cid, false)
    RETURNING id INTO gid;
  END IF;

  -- Re-check capacity inside the same txn (very fast)
  PERFORM 1
  FROM public.rank20_members
  WHERE group_id = gid
  GROUP BY group_id
  HAVING COUNT(*) < 20;

  IF NOT FOUND THEN
    -- No space anymore (another txn grabbed it), pick again
    gid := NULL;

    WITH g AS (
      SELECT rg.id
      FROM public.rank20_groups rg
      WHERE rg.challenge_id = cid
      ORDER BY rg.created_at ASC NULLS LAST, rg.id ASC
      FOR UPDATE SKIP LOCKED
    ),
    spot AS (
      SELECT g.id
      FROM g
      JOIN LATERAL (
        SELECT COUNT(*)::int AS member_count
        FROM public.rank20_members rm
        WHERE rm.group_id = g.id
      ) m ON true
      WHERE m.member_count < 20
      LIMIT 1
    )
    SELECT id INTO gid FROM spot;

    IF gid IS NULL THEN
      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (cid, false)
      RETURNING id INTO gid;
    END IF;
  END IF;

  -- Upsert membership (relocates if needed)
  INSERT INTO public.rank20_members (group_id, user_id, joined_at)
  VALUES (gid, uid, now())
  ON CONFLICT (user_id) DO UPDATE SET group_id = EXCLUDED.group_id, joined_at = now();

  RETURN QUERY SELECT gid, cid;
END
$$;
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated;

-- 4) Auto-enroll on signup (hook on user_profiles insert)
CREATE OR REPLACE FUNCTION public._rank20_auto_enroll_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role','authenticated','sub',NEW.user_id)::text,
    true
  );
  PERFORM public.ensure_rank20_membership();
  RETURN NEW;
END $$;
ALTER FUNCTION public._rank20_auto_enroll_from_profile() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._rank20_auto_enroll_from_profile() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_user_profiles_auto_enroll ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_auto_enroll
AFTER INSERT ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public._rank20_auto_enroll_from_profile();

-- 5) Helper function for testing (can be dropped later)
CREATE OR REPLACE FUNCTION public._arena_enroll_for(p_user uuid)
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role','authenticated','sub',p_user)::text, true);
  RETURN QUERY SELECT * FROM public.ensure_rank20_membership();
END $$;
ALTER FUNCTION public._arena_enroll_for(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arena_enroll_for(uuid) FROM PUBLIC;