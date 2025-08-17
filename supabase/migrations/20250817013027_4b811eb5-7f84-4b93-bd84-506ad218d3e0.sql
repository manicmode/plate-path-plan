-- Fix arena_recompute_and_refresh to refresh MV and maintain compatibility
CREATE OR REPLACE FUNCTION public.arena_recompute_and_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_challenge_id uuid;
  current_year integer := EXTRACT(year FROM now());
  current_month integer := EXTRACT(month FROM now());
BEGIN
  -- Active challenge
  SELECT id INTO current_challenge_id
  FROM public.arena_challenges
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF current_challenge_id IS NULL THEN
    RAISE NOTICE 'No active arena challenge found';
    RETURN;
  END IF;

  -- Rebuild rollups for current month
  DELETE FROM public.arena_leaderboard_rollups
  WHERE year = current_year
    AND month = current_month
    AND section = 'global'
    AND challenge_id = current_challenge_id;

  WITH event_totals AS (
    SELECT ae.user_id, SUM(ae.points) AS total_points
    FROM public.arena_events ae
    WHERE EXTRACT(year FROM ae.occurred_at) = current_year
      AND EXTRACT(month FROM ae.occurred_at) = current_month
    GROUP BY ae.user_id
  ),
  ranked_totals AS (
    SELECT et.user_id, et.total_points,
           ROW_NUMBER() OVER (ORDER BY et.total_points DESC, et.user_id) AS rank
    FROM event_totals et
    WHERE et.total_points > 0
  )
  INSERT INTO public.arena_leaderboard_rollups
    (challenge_id, year, month, user_id, rank, score, section)
  SELECT current_challenge_id, current_year, current_month,
         rt.user_id, rt.rank::int, rt.total_points::numeric, 'global'
  FROM ranked_totals rt
  ORDER BY rt.rank;

  -- IMPORTANT: keep earlier contract — refresh MV the UI uses
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.arena_billboard_mv;
  EXCEPTION WHEN undefined_table THEN
    -- if MV isn't present in this environment, just skip refresh
    NULL;
  END;

  RAISE NOTICE 'Arena leaderboard recomputed & MV refreshed for %-%', current_year, current_month;
END;
$$;

REVOKE ALL ON FUNCTION public.arena_recompute_and_refresh() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_recompute_and_refresh() TO authenticated;

-- Fix arena_debug_award_points to use correct column name
CREATE OR REPLACE FUNCTION public.arena_debug_award_points(p_points int, p_note text DEFAULT 'debug')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  me uuid := auth.uid();
  current_challenge_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Get active challenge
  SELECT id INTO current_challenge_id
  FROM public.arena_challenges
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF current_challenge_id IS NULL THEN
    RAISE EXCEPTION 'No active arena challenge found' USING ERRCODE = 'P0001';
  END IF;

  -- Insert into arena_events with correct column names
  INSERT INTO public.arena_events (challenge_id, user_id, points, occurred_at, kind)
  VALUES (current_challenge_id, me, p_points, now(), p_note);
  
  RAISE NOTICE 'Awarded % points to user % for challenge %', p_points, me, current_challenge_id;
END;
$$;

REVOKE ALL ON FUNCTION public.arena_debug_award_points(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_debug_award_points(int, text) TO authenticated;