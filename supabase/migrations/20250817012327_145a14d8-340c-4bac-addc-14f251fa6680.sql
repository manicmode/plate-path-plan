-- Debug: award points to the current user (for this month)
CREATE OR REPLACE FUNCTION public.arena_debug_award_points(p_points int, p_note text DEFAULT 'debug')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Insert points into arena_events
  INSERT INTO public.arena_events (user_id, points, occurred_at, kind)
  VALUES (me, p_points, now(), p_note);
END;
$$;

REVOKE ALL ON FUNCTION public.arena_debug_award_points(int, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_debug_award_points(int, text) TO authenticated;