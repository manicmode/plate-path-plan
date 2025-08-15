-- 1. Race condition protection: Update ensure_rank20_membership with advisory lock
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS table(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
  v_lock_key bigint;
BEGIN
  -- Advisory lock to prevent race conditions (SHA256 of UUID -> bigint)
  SELECT ('x' || substring(encode(digest(auth.uid()::text, 'sha256'), 'hex'), 1, 16))::bit(64)::bigint 
  INTO v_lock_key;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Already a member? return it
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    SELECT rg.challenge_id INTO v_challenge FROM public.rank20_groups rg WHERE rg.id = v_group;
    RETURN QUERY SELECT v_group, v_challenge;
    RETURN;
  END IF;

  -- Try to join an existing group with space (< 20 members)
  SELECT g.id, g.challenge_id
  INTO v_group, v_challenge
  FROM public.rank20_groups g
  WHERE COALESCE(g.is_closed, false) = false
    AND (
      SELECT count(*) FROM public.rank20_members m WHERE m.group_id = g.id
    ) < 20
  -- prefer most-filled group for faster matchmaking
  ORDER BY (SELECT count(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_group IS NULL THEN
    -- Create a fresh challenge + group
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

  -- Enroll the caller
  INSERT INTO public.rank20_members (user_id, group_id, joined_at)
  VALUES (auth.uid(), v_group, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_challenge;
END;
$$;

-- 2. Auto-close full groups: Create trigger function
CREATE OR REPLACE FUNCTION public.r20_close_full_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  member_count integer;
BEGIN
  -- Count members in the group
  SELECT count(*) INTO member_count
  FROM public.rank20_members
  WHERE group_id = NEW.group_id;

  -- If group has 20+ members, close it
  IF member_count >= 20 THEN
    UPDATE public.rank20_groups
    SET is_closed = true
    WHERE id = NEW.group_id
      AND COALESCE(is_closed, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to rank20_members
DROP TRIGGER IF EXISTS tr_r20_close_full_group ON public.rank20_members;
CREATE TRIGGER tr_r20_close_full_group
  AFTER INSERT ON public.rank20_members
  FOR EACH ROW
  EXECUTE FUNCTION public.r20_close_full_group();

-- 3. Performance & sanity indexes
CREATE INDEX IF NOT EXISTS idx_r20_members_group ON public.rank20_members(group_id);
CREATE INDEX IF NOT EXISTS idx_r20_groups_open ON public.rank20_groups(is_closed);
CREATE INDEX IF NOT EXISTS idx_r20_chat_msgs_chal_created ON public.rank20_chat_messages(challenge_id, created_at DESC);