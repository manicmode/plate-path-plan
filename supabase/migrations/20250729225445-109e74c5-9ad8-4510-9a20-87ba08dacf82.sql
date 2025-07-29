-- Create a generic function to add XP for any user activity
CREATE OR REPLACE FUNCTION public.add_user_xp(
  p_user_id uuid, 
  p_activity_type text, 
  p_activity_id uuid DEFAULT NULL,
  p_base_xp integer, 
  p_bonus_xp integer DEFAULT 0,
  p_reason text DEFAULT 'Activity Completed'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  total_xp INTEGER := p_base_xp + p_bonus_xp;
  new_total_xp INTEGER;
  xp_needed INTEGER;
  new_level INTEGER;
  duplicate_check INTEGER;
  time_threshold TIMESTAMP WITH TIME ZONE := now() - INTERVAL '2 hours';
BEGIN
  -- Check for duplicate XP within the last 2 hours for same activity type
  SELECT COUNT(*) INTO duplicate_check
  FROM public.workout_xp_logs 
  WHERE user_id = p_user_id 
    AND reason ILIKE '%' || p_activity_type || '%'
    AND created_at > time_threshold;

  -- If duplicate found within time threshold, skip XP award
  IF duplicate_check > 0 AND p_activity_type IN ('Meal Logged', 'Hydrated', 'Meditation Session') THEN
    RETURN;
  END IF;

  -- Insert XP log (reusing workout_xp_logs table with routine_id for activity_id)
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
    CASE 
      WHEN p_bonus_xp > 0 THEN (p_base_xp + p_bonus_xp)::numeric 
      ELSE p_base_xp::numeric 
    END,
    p_base_xp, 
    p_bonus_xp, 
    total_xp, 
    p_reason
  );

  -- Update or insert user level
  INSERT INTO public.user_levels (user_id, current_xp, xp_to_next_level)
  VALUES (p_user_id, total_xp, 100)
  ON CONFLICT (user_id) DO UPDATE
  SET current_xp = user_levels.current_xp + total_xp;

  -- Handle level-up logic
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
$function$;

-- Create XP tracking function for nutrition activities with streak bonuses
CREATE OR REPLACE FUNCTION public.award_nutrition_xp(
  p_user_id uuid,
  p_activity_type text,
  p_activity_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  base_xp INTEGER;
  bonus_xp INTEGER := 0;
  reason_text TEXT;
  user_streak INTEGER := 0;
BEGIN
  -- Determine base XP and reason based on activity type
  CASE p_activity_type
    WHEN 'nutrition' THEN
      base_xp := 10;
      reason_text := 'Meal Logged';
    WHEN 'hydration' THEN
      base_xp := 5;
      reason_text := 'Hydrated';
    WHEN 'supplement' THEN
      base_xp := 8;
      reason_text := 'Supplement Taken';
    ELSE
      base_xp := 5;
      reason_text := 'Nutrition Activity';
  END CASE;

  -- Get user's current streak for bonus calculation
  SELECT 
    CASE p_activity_type
      WHEN 'nutrition' THEN COALESCE(current_nutrition_streak, 0)
      WHEN 'hydration' THEN COALESCE(current_hydration_streak, 0)
      WHEN 'supplement' THEN COALESCE(current_supplement_streak, 0)
      ELSE 0
    END INTO user_streak
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  -- Award streak bonus (1 XP per day of streak, max 10 bonus)
  IF user_streak >= 3 THEN
    bonus_xp := LEAST(user_streak, 10);
    reason_text := reason_text || ' (Streak Bonus)';
  END IF;

  -- Call generic XP function
  PERFORM public.add_user_xp(
    p_user_id, 
    p_activity_type,
    p_activity_id,
    base_xp, 
    bonus_xp, 
    reason_text
  );
END;
$function$;

-- Create XP tracking function for recovery activities
CREATE OR REPLACE FUNCTION public.award_recovery_xp(
  p_user_id uuid,
  p_recovery_type text,
  p_session_id uuid,
  p_duration_minutes integer DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  base_xp INTEGER;
  bonus_xp INTEGER := 0;
  reason_text TEXT;
  duration_bonus INTEGER := 0;
BEGIN
  -- Determine base XP based on recovery type
  CASE p_recovery_type
    WHEN 'meditation' THEN
      base_xp := 15;
      reason_text := 'Meditation Session';
    WHEN 'yoga' THEN
      base_xp := 12;
      reason_text := 'Yoga Practice';
    WHEN 'breathing' THEN
      base_xp := 8;
      reason_text := 'Breathing Exercise';
    WHEN 'sleep' THEN
      base_xp := 10;
      reason_text := 'Sleep Tracking';
    WHEN 'stretching' THEN
      base_xp := 8;
      reason_text := 'Stretching Session';
    WHEN 'muscle-recovery' THEN
      base_xp := 10;
      reason_text := 'Recovery Practice';
    ELSE
      base_xp := 10;
      reason_text := 'Recovery Activity';
  END CASE;

  -- Duration bonus for longer sessions (1 XP per 5 minutes, max 10 bonus)
  IF p_duration_minutes > 0 THEN
    duration_bonus := LEAST(p_duration_minutes / 5, 10);
    IF duration_bonus > 0 THEN
      bonus_xp := duration_bonus;
      reason_text := reason_text || ' (Duration Bonus)';
    END IF;
  END IF;

  -- Call generic XP function
  PERFORM public.add_user_xp(
    p_user_id, 
    p_recovery_type,
    p_session_id,
    base_xp, 
    bonus_xp, 
    reason_text
  );
END;
$function$;