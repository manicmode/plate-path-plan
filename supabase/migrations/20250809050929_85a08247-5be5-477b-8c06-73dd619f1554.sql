-- Fix overload ambiguity: pass explicit NULL::text to apply_daily_cap
CREATE OR REPLACE FUNCTION public.add_user_xp(
  p_user_id uuid,
  p_activity_type text,
  p_base_xp integer,
  p_activity_id uuid DEFAULT NULL,
  p_bonus_xp integer DEFAULT 0,
  p_reason text DEFAULT 'Activity Completed'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  total_input int := GREATEST(0, COALESCE(p_base_xp,0) + COALESCE(p_bonus_xp,0));
  final_award int;
  new_total_xp INTEGER;
  xp_needed INTEGER;
  new_level INTEGER;
  duplicate_check INTEGER;
  time_threshold TIMESTAMP WITH TIME ZONE := now() - INTERVAL '2 hours';
BEGIN
  -- Keep existing duplicate/cooldown protection (skip some rapid repeats)
  BEGIN
    SELECT COUNT(*) INTO duplicate_check
    FROM public.workout_xp_logs 
    WHERE user_id = p_user_id 
      AND reason ILIKE '%' || p_activity_type || '%'
      AND created_at > time_threshold;
  EXCEPTION WHEN undefined_table THEN
    duplicate_check := 0; -- If table missing in some env, do not block awards
  END;

  IF duplicate_check > 0 AND p_activity_type IN ('Meal Logged', 'Hydrated', 'Meditation Session') THEN
    RETURN;
  END IF;

  -- Cap the total before logging/tallying (disambiguate overload)
  final_award := public.apply_daily_cap(p_user_id, total_input, NULL::text);

  -- Insert XP log; keep base/bonus inputs, store final capped award in total_xp
  INSERT INTO public.workout_xp_logs (
    user_id, 
    routine_id, 
    performance_score, 
    base_xp, 
    bonus_xp, 
    total_xp, 
    reason
  )
  VALUES (
    p_user_id, 
    p_activity_id, 
    total_input, 
    COALESCE(p_base_xp,0), 
    COALESCE(p_bonus_xp,0), 
    final_award, 
    p_reason
  );

  -- Upsert level tally with capped award only
  INSERT INTO public.user_levels (user_id, current_xp, xp_to_next_level)
  VALUES (p_user_id, final_award, 100)
  ON CONFLICT (user_id) DO UPDATE
  SET current_xp = user_levels.current_xp + EXCLUDED.current_xp;

  -- Preserve existing level-up loop behavior
  SELECT current_xp, xp_to_next_level INTO new_total_xp, xp_needed 
  FROM public.user_levels 
  WHERE user_id = p_user_id;

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