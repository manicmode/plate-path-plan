-- STEP 1: Show current function definitions for clarity
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname IN
('my_rank20_chosen_challenge','my_rank20_chosen_challenge_id','ensure_rank20_membership');

-- STEP 2: Add an explicit active-rank function (stable, no RLS issues)
CREATE OR REPLACE FUNCTION public._active_rank20_challenge_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO pg_catalog, public
AS $$
  SELECT pc.id
  FROM public.private_challenges pc
  WHERE pc.category IN ('rank_of_20','rank20')
    AND COALESCE(pc.status,'active')='active'
    AND pc.start_date <= CURRENT_DATE
    AND pc.start_date + (pc.duration_days||' days')::interval > CURRENT_DATE
  ORDER BY pc.start_date DESC, pc.created_at DESC
  LIMIT 1
$$;
ALTER FUNCTION public._active_rank20_challenge_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._active_rank20_challenge_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._active_rank20_challenge_id() TO authenticated;

-- STEP 3: Replace ensure_rank20_membership to use _active_rank20_challenge_id() (not my_* wrapper)
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

  -- Always target the ACTIVE Arena challenge (rank_of_20), independent of current membership
  SELECT public._active_rank20_challenge_id() INTO cid;
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

  -- If already in the active Arena challenge, return it
  IF gid IS NOT NULL AND current_cid = cid THEN
    RETURN QUERY SELECT gid, cid;
    RETURN;
  END IF;

  -- Find an open group for the active Arena challenge (or create one)
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

  -- Upsert membership to the Arena group (this relocates if needed)
  INSERT INTO public.rank20_members (group_id, user_id, joined_at)
  VALUES (gid, uid, now())
  ON CONFLICT (user_id) DO UPDATE SET group_id = EXCLUDED.group_id, joined_at = now();

  RETURN QUERY SELECT gid, cid;
END
$$;
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated;

-- STEP 4: Verify (authenticated, no secrets; one-shot helper)
-- Recreate the short-lived wrapper, run it, then drop it.
CREATE OR REPLACE FUNCTION public._arena_realign_for_user(p_user uuid)
RETURNS TABLE(group_id uuid, challenge_id uuid, chosen_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role','authenticated','sub',p_user)::text,
    true
  );
  RETURN QUERY
  WITH ens AS (
    SELECT * FROM ensure_rank20_membership() LIMIT 1
  )
  SELECT ens.group_id, ens.challenge_id,
         (SELECT public._active_rank20_challenge_id())
  FROM ens;
END
$$;
ALTER FUNCTION public._arena_realign_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arena_realign_for_user(uuid) FROM PUBLIC;

-- Get the test user, execute, and show category
WITH au AS (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
), rm AS (
  SELECT user_id AS id FROM public.rank20_members LIMIT 1
)
SELECT COALESCE((SELECT id FROM au), (SELECT id FROM rm)) AS test_user_id;

-- Replace with actual user ID: f8458f5c-cd73-44ba-a818-6996d23e454b
SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b');

WITH g AS (
  SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b')
)
SELECT g.group_id, g.challenge_id, pc.category, pc.status, pc.start_date, pc.duration_days
FROM g
LEFT JOIN public.private_challenges pc ON pc.id = g.challenge_id;

-- Clean up the wrapper
DROP FUNCTION public._arena_realign_for_user(uuid);