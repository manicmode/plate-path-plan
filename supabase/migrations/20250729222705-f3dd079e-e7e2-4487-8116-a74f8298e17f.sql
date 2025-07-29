-- Fix the add_workout_xp function with proper search path
CREATE OR REPLACE FUNCTION public.add_workout_xp(
  p_user_id UUID,
  p_routine_id UUID,
  p_score NUMERIC,
  p_reason TEXT DEFAULT 'Completed Workout'
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  base_xp INTEGER := FLOOR(p_score);
  bonus_xp INTEGER := CASE 
    WHEN p_score >= 90 THEN 20
    WHEN p_score >= 75 THEN 10
    ELSE 0
  END;
  total INTEGER := base_xp + bonus_xp;
  new_total_xp INTEGER;
  xp_needed INTEGER;
  new_level INTEGER;
BEGIN
  -- Insert XP log
  INSERT INTO public.workout_xp_logs (user_id, routine_id, performance_score, base_xp, bonus_xp, total_xp, reason)
  VALUES (p_user_id, p_routine_id, p_score, base_xp, bonus_xp, total, p_reason);

  -- Update or insert level
  INSERT INTO public.user_levels (user_id, current_xp, xp_to_next_level)
  VALUES (p_user_id, total, 100)
  ON CONFLICT (user_id) DO UPDATE
  SET current_xp = user_levels.current_xp + total;

  -- Handle level-up logic
  SELECT current_xp, xp_to_next_level INTO new_total_xp, xp_needed FROM public.user_levels WHERE user_id = p_user_id;

  WHILE new_total_xp >= xp_needed LOOP
    new_total_xp := new_total_xp - xp_needed;
    new_level := (SELECT level FROM public.user_levels WHERE user_id = p_user_id) + 1;
    xp_needed := new_level * 100;

    UPDATE public.user_levels
    SET level = new_level,
        current_xp = new_total_xp,
        xp_to_next_level = xp_needed,
        last_leveled_up_at = now()
    WHERE user_id = p_user_id;
  END LOOP;
END;
$$;