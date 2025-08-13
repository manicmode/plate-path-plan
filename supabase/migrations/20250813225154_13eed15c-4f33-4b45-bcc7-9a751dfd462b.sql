-- Secure RPC for seeding billboard events (OK to keep as-is)
CREATE OR REPLACE FUNCTION public.seed_billboard_events(_challenge_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller is a member or creator
  IF NOT EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    LEFT JOIN public.private_challenge_participations p
      ON p.private_challenge_id = pc.id AND p.user_id = auth.uid()
    WHERE pc.id = _challenge_id
      AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'not a member of this challenge';
  END IF;

  -- Sample inserts
  INSERT INTO public.billboard_events (challenge_id, author_system, author_user_id, kind, title, body, meta, created_at)
  VALUES
    (_challenge_id, true, auth.uid(), 'rank_jump', 'Sally rockets to #2!', 'Up 3 places overnight. Morning runs paying off.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'streak', 'Tom hits a 14-day streak', 'Longest in the group so far.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'team_record', 'Team record day', 'Average steps 12,400 — new high!', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'milestone', 'Mary crosses 100km total', 'She's been unstoppable this week.', '{}'::jsonb, now()),
    (_challenge_id, true, auth.uid(), 'comeback', 'Danny climbs back into top 3', 'Was in 7th last week.', '{}'::jsonb, now());
END
$$;

GRANT EXECUTE ON FUNCTION public.seed_billboard_events(uuid) TO authenticated;

-- Secure diagnostics RPC (fixed: remove non-existent batch_number, join to groups to get it)
CREATE OR REPLACE FUNCTION public.diag_rank20()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  result jsonb := '{}';
  user_membership boolean := false;
  user_assignment jsonb;
BEGIN
  -- Does the user belong to any Rank-of-20 challenge?
  SELECT EXISTS (
    SELECT 1
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc ON pc.id = pcp.private_challenge_id
    WHERE pcp.user_id = current_user_id
      AND pc.challenge_type = 'rank_of_20'
  ) INTO user_membership;

  -- One assignment object (with batch number via rank20_groups if present)
  SELECT jsonb_build_object(
           'challenge_id', pc.id,
           'challenge_title', pc.title,
           'batch_number', rg.batch_number,
           'user_is_member', true
         )
    INTO user_assignment
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc ON pc.id = pcp.private_challenge_id
    LEFT JOIN public.rank20_groups rg ON rg.challenge_id = pc.id
    WHERE pcp.user_id = current_user_id
      AND pc.challenge_type = 'rank_of_20'
    LIMIT 1;

  result := jsonb_build_object(
    'user_id', current_user_id,
    'has_rank20_membership', user_membership,
    'user_assignment', COALESCE(user_assignment, 'null'::jsonb),
    'table_checks', jsonb_build_object(
      'rank20_groups_accessible', (SELECT count(*) > 0 FROM public.rank20_groups),
      'private_challenges_accessible', (SELECT count(*) > 0 FROM public.private_challenges),
      'participations_accessible', (SELECT count(*) > 0 FROM public.private_challenge_participations),
      'billboard_events_accessible', (SELECT count(*) > 0 FROM public.billboard_events)
    )
  );

  RETURN result;
END
$$;

GRANT EXECUTE ON FUNCTION public.diag_rank20() TO authenticated;