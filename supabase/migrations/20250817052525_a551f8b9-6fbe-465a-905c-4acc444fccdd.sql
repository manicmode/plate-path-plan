CREATE OR REPLACE FUNCTION public.arena_enroll_me()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $function$
DECLARE
  v_user_id         uuid := auth.uid();
  v_group_id        uuid;
  v_mem_id          uuid;
  v_mem_group_id    uuid;
  v_mem_challenge   uuid;
  v_any_challenge   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 1) Find THIS USER's most relevant membership
  SELECT id, group_id, challenge_id
    INTO v_mem_id, v_mem_group_id, v_mem_challenge
  FROM public.arena_memberships
  WHERE user_id = v_user_id
  ORDER BY (status = 'active') DESC NULLS LAST,
           joined_at DESC NULLS LAST,
           id DESC
  LIMIT 1;

  -- 1a) If membership exists and already has a group -> we're done
  IF v_mem_id IS NOT NULL AND v_mem_group_id IS NOT NULL THEN
    RETURN v_mem_group_id;
  END IF;

  -- 2) If membership exists BUT group is NULL: attach/create a group for the SAME challenge_id
  IF v_mem_id IS NOT NULL AND v_mem_group_id IS NULL THEN
    -- try to find an existing group for this challenge
    SELECT id
      INTO v_group_id
    FROM public.arena_groups
    WHERE challenge_id = v_mem_challenge
    ORDER BY created_at DESC NULLS LAST, id DESC
    LIMIT 1;

    -- create a group for this challenge if none exist
    IF v_group_id IS NULL THEN
      INSERT INTO public.arena_groups (challenge_id, name)
      VALUES (v_mem_challenge, 'Arena')
      RETURNING id INTO v_group_id;
    END IF;

    -- update the user's membership to point at the new/claimed group
    UPDATE public.arena_memberships
       SET group_id = v_group_id,
           status = COALESCE(status, 'active'),
           joined_at = COALESCE(joined_at, now())
     WHERE id = v_mem_id;

    RETURN v_group_id;
  END IF;

  -- 3) No membership for this user yet
  -- First, prefer joining the most recent existing group (keeps people together)
  SELECT id
    INTO v_group_id
  FROM public.arena_groups
  ORDER BY created_at DESC NULLS LAST, id DESC
  LIMIT 1;

  IF v_group_id IS NULL THEN
    -- Need a challenge_id for the new group.
    -- Try to reuse one from any existing membership row (most recent).
    SELECT challenge_id
      INTO v_any_challenge
    FROM public.arena_memberships
    ORDER BY joined_at DESC NULLS LAST, id DESC
    LIMIT 1;

    IF v_any_challenge IS NULL THEN
      -- Absolute last resort: generate a UUID (only safe if no FK exists).
      -- If a FK exists to a challenges table, this would fail; that's OK and will surface clearly.
      v_any_challenge := gen_random_uuid();
    END IF;

    INSERT INTO public.arena_groups (challenge_id, name)
    VALUES (v_any_challenge, 'Arena')
    RETURNING id INTO v_group_id;
  END IF;

  -- Create the user's membership pointing to that group (and its challenge_id)
  INSERT INTO public.arena_memberships (challenge_id, group_id, user_id, status, joined_at)
  SELECT g.challenge_id, v_group_id, v_user_id, 'active', now()
  FROM public.arena_groups g
  WHERE g.id = v_group_id
  ON CONFLICT DO NOTHING;

  RETURN v_group_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.arena_enroll_me() TO authenticated;