-- 1) Canonical cooldown + telemetry in add_user_xp
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
  -- Canonical base reason mapping
  base_reason := CASE 
    WHEN p_activity_type IN ('nutrition','meal') THEN 'Meal Logged'
    WHEN p_activity_type = 'hydration' THEN 'Hydrated'
    WHEN p_activity_type = 'workout' THEN 'Completed Workout'
    WHEN p_activity_type = 'recovery' THEN 'Recovery Session'
    ELSE split_part(COALESCE(p_reason,'Activity Completed'), ' (', 1)
  END;

  -- Telemetry (no PII beyond user_id)
  PERFORM public.log_security_event(jsonb_build_object(
    'type','suspicious_activity',
    'source','direct',
    'action','add_user_xp_call',
    'details', jsonb_build_object(
      'user_id', p_user_id::text,
      'activity_type', p_activity_type,
      'base_xp', COALESCE(p_base_xp,0),
      'reason', COALESCE(p_reason,'Activity Completed')
    )
  ));

  -- Cooldown/duplicate guard: exact match on base reason in last 2 hours
  IF EXISTS (
    SELECT 1 FROM public.workout_xp_logs
    WHERE user_id = p_user_id
      AND split_part(reason, ' (', 1) = base_reason
      AND created_at > now() - interval '2 hours'
  ) THEN
    RETURN;
  END IF;

  -- Apply daily cap (explicit NULL::text to avoid overload ambiguity)
  final_award := public.apply_daily_cap(p_user_id, total_input, NULL::text);

  -- Log XP with capped total
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

  -- Level-up loop (preserve existing simple 100/x level steps)
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

-- 2) Nutrition wrapper with canonical base_xp + telemetry
CREATE OR REPLACE FUNCTION public.award_nutrition_xp(
  p_user_id uuid,
  p_activity_type text,
  p_activity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  base_xp int;
  reason_text text;
BEGIN
  CASE 
    WHEN p_activity_type IN ('nutrition','meal') THEN base_xp := 3; reason_text := 'Meal Logged';
    WHEN p_activity_type = 'hydration' THEN base_xp := 1; reason_text := 'Hydrated';
    WHEN p_activity_type = 'supplement' THEN base_xp := 4; reason_text := 'Supplement Logged';
    ELSE base_xp := 2; reason_text := 'Nutrition Activity';
  END CASE;

  -- Telemetry
  PERFORM public.log_security_event(jsonb_build_object(
    'type','suspicious_activity',
    'source','nutrition_wrapper',
    'action','award_nutrition_xp_call',
    'details', jsonb_build_object(
      'user_id', p_user_id::text,
      'activity_type', p_activity_type,
      'base_xp', base_xp,
      'reason', reason_text
    )
  ));

  PERFORM public.add_user_xp(p_user_id, p_activity_type, base_xp, p_activity_id, 0, reason_text);
END;
$$;

-- 3) Safety index for cooldown lookups
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_created_reason
  ON public.workout_xp_logs (user_id, created_at DESC, reason);
