
-- 0) Safety: make sure RLS-bypassing functions stay tight and callable by the app
-- (we'll set OWNER to postgres, STABLE volatility, and precise EXECUTE grants)

--------------------------------------------------------------------------------
-- 1) ensure_rank20_membership: add advisory lock (hashtextextended), NULL-safe close,
--    concurrency-safe join/create, and return (group_id, challenge_id)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
  v_lock_key bigint;
BEGIN
  -- Per-user transaction advisory lock (no pgcrypto; avoids digest() signature issues)
  SELECT hashtextextended(auth.uid()::text, 0) INTO v_lock_key;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- If already a member, return existing membership
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    SELECT rg.challenge_id INTO v_challenge FROM public.rank20_groups rg WHERE rg.id = v_group;
    RETURN QUERY SELECT v_group, v_challenge;
    RETURN;
  END IF;

  -- Try to join an existing open group with space (treat NULL as open)
  SELECT g.id, g.challenge_id
  INTO v_group, v_challenge
  FROM public.rank20_groups g
  WHERE COALESCE(g.is_closed, false) = false
    AND (
      SELECT count(*) FROM public.rank20_members m WHERE m.group_id = g.id
    ) < 20
  ORDER BY (SELECT count(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  -- If none found, create a fresh challenge + group
  IF v_group IS NULL THEN
    INSERT INTO public.private_challenges (
      title,
      description,
      challenge_type,
      creator_id,
      status,
      start_date,
      duration_days,
      max_participants
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

    INSERT INTO public.rank20_groups (id, challenge_id, is_closed)
    VALUES (gen_random_uuid(), v_challenge, false)
    RETURNING id INTO v_group;
  END IF;

  -- Enroll caller (idempotent)
  INSERT INTO public.rank20_members (user_id, group_id, joined_at)
  VALUES (auth.uid(), v_group, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_challenge;
END;
$$;

-- Tighten permissions/ownership
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
ALTER FUNCTION public.ensure_rank20_membership() STABLE;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

--------------------------------------------------------------------------------
-- 2) Auto-close full groups: trigger closes a group once it reaches 20+
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.r20_close_full_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT count(*) INTO member_count
  FROM public.rank20_members
  WHERE group_id = NEW.group_id;

  IF member_count >= 20 THEN
    UPDATE public.rank20_groups
    SET is_closed = true
    WHERE id = NEW.group_id
      AND COALESCE(is_closed, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_r20_close_full_group ON public.rank20_members;
CREATE TRIGGER tr_r20_close_full_group
  AFTER INSERT ON public.rank20_members
  FOR EACH ROW
  EXECUTE FUNCTION public.r20_close_full_group();

--------------------------------------------------------------------------------
-- 3) Performance & sanity indexes + enforce single-group membership
--------------------------------------------------------------------------------
-- Deduplicate existing multiple memberships (keep earliest joined_at per user)
WITH ranked AS (
  SELECT ctid, user_id, group_id, joined_at,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at NULLS LAST, ctid) AS rn
  FROM public.rank20_members
)
DELETE FROM public.rank20_members m
USING ranked r
WHERE m.ctid = r.ctid AND r.rn > 1;

-- Enforce single group per user going forward
CREATE UNIQUE INDEX IF NOT EXISTS ux_rank20_members_user ON public.rank20_members (user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_r20_members_group ON public.rank20_members(group_id);
CREATE INDEX IF NOT EXISTS idx_r20_groups_open ON public.rank20_groups(is_closed);
CREATE INDEX IF NOT EXISTS idx_r20_chat_msgs_chal_created ON public.rank20_chat_messages(challenge_id, created_at DESC);

--------------------------------------------------------------------------------
-- 4) Make send fully membership-aware: arena_post_message ensures membership first
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Ensure membership and get the correct challenge_id
  SELECT group_id, challenge_id
  INTO v_group, v_challenge
  FROM public.ensure_rank20_membership();

  -- Insert message
  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
  VALUES (v_challenge, auth.uid(), p_content)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
ALTER FUNCTION public.arena_post_message(text) STABLE;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM public;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;
