-- First create the ensure_rank20_membership function
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS table(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
BEGIN
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

-- Set proper permissions
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
ALTER FUNCTION public.ensure_rank20_membership() STABLE;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

-- Enforce single-group membership with unique index
CREATE UNIQUE INDEX IF NOT EXISTS ux_rank20_members_user ON public.rank20_members (user_id);

-- Update arena_post_message to be fully membership-aware
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

  -- Ensure I'm in a group; get challenge_id
  SELECT group_id, challenge_id INTO v_group, v_challenge
  FROM public.ensure_rank20_membership();

  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
  VALUES (v_challenge, auth.uid(), p_content)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

ALTER FUNCTION public.arena_post_message(text) STABLE;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM public;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;