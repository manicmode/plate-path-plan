-- ========================================
-- Final Arena Stabilization (Back-compat + Concurrency + Safety)
-- Owner: postgres | Safe to rerun
-- ========================================

-- 0) De-dupe memberships, then enforce uniqueness
WITH ranked AS (
  SELECT group_id, user_id, joined_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at NULLS LAST) rn
  FROM public.rank20_members
)
DELETE FROM public.rank20_members rm
USING ranked r
WHERE rm.user_id = r.user_id
  AND rm.group_id = r.group_id
  AND COALESCE(r.joined_at, rm.joined_at) IS NOT DISTINCT FROM rm.joined_at
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rank20_members_user ON public.rank20_members(user_id);

-- 1) Helper with secure posture
CREATE OR REPLACE FUNCTION public._current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO pg_catalog, public
AS $$ SELECT auth.uid() $$;
ALTER FUNCTION public._current_user_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._current_user_id() TO authenticated;

-- 2) Clean drops (safe)
DROP FUNCTION IF EXISTS public.ensure_rank20_membership();
DROP FUNCTION IF EXISTS public.my_rank20_chosen_challenge_id();
DROP FUNCTION IF EXISTS public.my_rank20_chosen_challenge();
DROP FUNCTION IF EXISTS public.arena_post_message(text);

-- 3) Active challenge resolver (table-return)
CREATE OR REPLACE FUNCTION public.my_rank20_chosen_challenge()
RETURNS TABLE(private_challenge_id uuid, member_count integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO pg_catalog, public
AS $$
  WITH me AS (SELECT _current_user_id() AS uid),
  my_group AS (
    SELECT rg.challenge_id, rm.group_id
    FROM rank20_members rm
    JOIN rank20_groups rg ON rg.id = rm.group_id
    JOIN me ON me.uid = rm.user_id
    LIMIT 1
  ),
  group_count AS (
    SELECT mg.challenge_id,
           COUNT(rm2.user_id)::int AS member_count
    FROM my_group mg
    JOIN rank20_members rm2 ON rm2.group_id = mg.group_id
    GROUP BY mg.challenge_id
  ),
  active AS (
    SELECT pc.id, 0::int AS member_count
    FROM private_challenges pc
    WHERE pc.category IN ('rank20','rank_of_20')
      AND COALESCE(pc.status,'active')='active'
      AND (pc.start_date IS NULL OR pc.start_date <= CURRENT_DATE)
      AND (pc.start_date IS NULL OR pc.start_date + (pc.duration_days||' days')::interval > CURRENT_DATE)
    ORDER BY pc.start_date NULLS LAST, pc.created_at NULLS LAST
    LIMIT 1
  )
  SELECT challenge_id, member_count FROM group_count
  UNION ALL
  SELECT id, member_count FROM active
  LIMIT 1
$$;
ALTER FUNCTION public.my_rank20_chosen_challenge() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge() TO authenticated;

-- 4) Back-compat wrapper returning uuid
CREATE OR REPLACE FUNCTION public.my_rank20_chosen_challenge_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO pg_catalog, public
AS $$ SELECT private_challenge_id FROM public.my_rank20_chosen_challenge() LIMIT 1 $$;
ALTER FUNCTION public.my_rank20_chosen_challenge_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id() TO authenticated;

-- 5) Membership guarantee (no nonexistent columns)
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
  uid := _current_user_id();
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;

  -- per-user serialization
  IF NOT pg_try_advisory_xact_lock( ('x'||substr(md5(uid::text),1,16))::bit(64)::bigint ) THEN
    RAISE EXCEPTION 'Concurrent membership operation detected, please retry';
  END IF;

  -- already a member?
  SELECT rm.group_id, rg.challenge_id INTO gid, cid
  FROM rank20_members rm JOIN rank20_groups rg ON rg.id = rm.group_id
  WHERE rm.user_id = uid LIMIT 1;
  IF gid IS NOT NULL THEN RETURN QUERY SELECT gid, cid; RETURN; END IF;

  -- pick challenge
  SELECT public.my_rank20_chosen_challenge_id() INTO cid;
  IF cid IS NULL THEN RAISE EXCEPTION 'No active Arena challenge configured'; END IF;

  -- join not-full group
  WITH candidate AS (
    SELECT rg.id FROM rank20_groups rg
    WHERE COALESCE(rg.is_closed,false)=false AND rg.challenge_id=cid
    FOR UPDATE SKIP LOCKED
  ),
  spot AS (
    SELECT c.id
    FROM candidate c
    JOIN LATERAL (SELECT count(*)::int AS member_count FROM rank20_members rm WHERE rm.group_id=c.id) m ON true
    WHERE m.member_count < 20
    ORDER BY m.member_count ASC
    LIMIT 1
  )
  SELECT id INTO gid FROM spot;

  -- else create group
  IF gid IS NULL THEN
    INSERT INTO rank20_groups (challenge_id, is_closed)
    VALUES (cid, false)
    RETURNING id INTO gid;
  END IF;

  -- insert membership (idempotent)
  INSERT INTO rank20_members (group_id, user_id, joined_at)
  VALUES (gid, uid, now())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT rg.challenge_id INTO cid FROM rank20_groups rg WHERE rg.id = gid;
  RETURN QUERY SELECT gid, cid;
END
$$;
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated;

-- 6) Post message (writes to rank20_chat_messages)
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
SET search_path TO pg_catalog, public
AS $$
DECLARE
  uid uuid; gid uuid; cid uuid; mid uuid;
BEGIN
  uid := _current_user_id();
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_content IS NULL OR length(btrim(p_content))=0 THEN RAISE EXCEPTION 'Message content required'; END IF;

  SELECT rm.group_id, rg.challenge_id INTO gid, cid
  FROM rank20_members rm JOIN rank20_groups rg ON rg.id = rm.group_id
  WHERE rm.user_id = uid LIMIT 1;

  IF gid IS NULL THEN
    SELECT e.group_id, e.challenge_id INTO gid, cid FROM ensure_rank20_membership() e LIMIT 1;
  END IF;

  INSERT INTO rank20_chat_messages (id, challenge_id, user_id, body, created_at)
  VALUES (gen_random_uuid(), cid, uid, p_content, now())
  RETURNING id INTO mid;

  RETURN mid;
END
$$;
ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated;

-- 7) Seed an active Arena challenge if none for today
DO $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM private_challenges pc
    WHERE pc.category IN ('rank20','rank_of_20')
      AND COALESCE(pc.status,'active')='active'
      AND (pc.start_date IS NULL OR pc.start_date <= CURRENT_DATE)
      AND (pc.start_date IS NULL OR pc.start_date + (pc.duration_days||' days')::interval > CURRENT_DATE)
  ) INTO v_exists;

  IF NOT v_exists THEN
    INSERT INTO private_challenges (id, title, description, category, status, start_date, duration_days, created_at)
    VALUES (gen_random_uuid(), 'Arena — Rank of 20', 'Auto-seeded active challenge',
            'rank_of_20', 'active', CURRENT_DATE, 30, now());
  END IF;
END $$;