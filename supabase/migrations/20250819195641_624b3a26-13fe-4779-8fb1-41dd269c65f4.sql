-- Create pause RPC for user habits
CREATE OR REPLACE FUNCTION public.rpc_pause_user_habit_by_slug(p_habit_slug text, p_paused boolean)
RETURNS public.user_habit
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS
$$
DECLARE
  v_user uuid := auth.uid();
  v_row public.user_habit;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.user_habit
  SET is_paused = COALESCE(p_paused, false), updated_at = now()
  WHERE user_id = v_user AND slug = p_habit_slug
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN RAISE EXCEPTION 'Habit not found for current user: %', p_habit_slug; END IF;
  RETURN v_row;
END;
$$;