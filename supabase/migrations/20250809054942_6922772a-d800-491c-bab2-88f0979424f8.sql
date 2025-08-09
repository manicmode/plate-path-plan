-- Remove TEMP hydration-only debug logs from add_user_xp, keep concise logs
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
  base_reason text;
BEGIN
  base_reason := CASE 
    WHEN p_activity_type IN ('nutrition','meal') THEN 'Meal Logged'
    WHEN p_activity_type = 'hydration' THEN 'Hydrated'
    WHEN p_activity_type = 'workout' THEN 'Completed Workout'
    WHEN p_activity_type = 'recovery' THEN 'Recovery Session'
    ELSE split_part(COALESCE(p_reason,'Activity Completed'), ' (', 1)
  END;

  -- Cooldown/duplicate guard: exact match on base reason in last 2 hours
  IF EXISTS (
    SELECT 1 FROM public.workout_xp_logs
    WHERE user_id = p_user_id
      AND split_part(reason, ' (', 1) = base_reason
      AND created_at > now() - interval '2 hours'
  ) THEN
    RAISE LOG 'xp_duplicate_suppressed: %', jsonb_build_object(
      'user_id', p_user_id::text,
      'base_reason', base_reason,
      'activity_type', p_activity_type,
      'ts', now()
    );
    RETURN;
  END IF;

  -- Apply daily cap
  final_award := public.apply_daily_cap(p_user_id, total_input, NULL::text);

  -- Significant awards only (>=5)
  IF final_award >= 5 THEN
    RAISE LOG 'xp_award: %', jsonb_build_object(
      'user_id', p_user_id::text,
      'base_reason', base_reason,
      'total_input', total_input,
      'final_award', final_award,
      'reason', COALESCE(p_reason, base_reason),
      'ts', now()
    );
  END IF;

  -- Insert XP log
  INSERT INTO public.workout_xp_logs (
    user_id, routine_id, performance_score, base_xp, bonus_xp, total_xp, reason
  ) VALUES (
    p_user_id, p_activity_id, total_input, COALESCE(p_base_xp,0), COALESCE(p_bonus_xp,0), final_award, COALESCE(p_reason, base_reason)
  );

  -- Upsert user_levels tally
  INSERT INTO public.user_levels (user_id, current_xp, xp_to_next_level)
  VALUES (p_user_id, final_award, 100)
  ON CONFLICT (user_id) DO UPDATE
  SET current_xp = user_levels.current_xp + EXCLUDED.current_xp;

  -- Level-up loop
  SELECT current_xp, xp_to_next_level INTO new_total_xp, xp_needed 
  FROM public.user_levels WHERE user_id = p_user_id;

  WHILE new_total_xp >= xp_needed LOOP
    UPDATE public.user_levels
    SET level = COALESCE(level, 1) + 1
    WHERE user_id = p_user_id;

    SELECT level, current_xp, xp_to_next_level 
    INTO new_level, new_total_xp, xp_needed 
    FROM public.user_levels WHERE user_id = p_user_id;

    new_total_xp := new_total_xp - xp_needed;
    xp_needed := (new_level + 1) * 100;

    UPDATE public.user_levels
    SET current_xp = new_total_xp,
        xp_to_next_level = xp_needed,
        last_leveled_up_at = now()
    WHERE user_id = p_user_id;
  END LOOP;
END;
$$;