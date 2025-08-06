-- Final comprehensive security cleanup migration
-- Drop and recreate all problematic views and functions

-- 1. Drop all problematic views completely
DROP VIEW IF EXISTS public.routine_performance_analytics CASCADE;
DROP VIEW IF EXISTS public.workout_skipping_analysis CASCADE;
DROP VIEW IF EXISTS public.muscle_group_weekly_analysis CASCADE;
DROP VIEW IF EXISTS public.workout_intensity_distribution CASCADE;

-- 2. Drop and recreate problematic functions with proper security settings
DROP FUNCTION IF EXISTS public.log_security_event(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_violation(text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.validate_security_event(jsonb) CASCADE;

-- 3. Recreate views without SECURITY DEFINER (regular views)
CREATE VIEW public.routine_performance_analytics AS
SELECT 
  r.user_id,
  r.id as routine_id,
  r.routine_name,
  COUNT(wl.id) as total_workouts,
  AVG(wl.performance_score) as avg_performance_score,
  MAX(wl.performance_score) as best_performance_score,
  AVG(wl.total_duration_minutes) as avg_duration_minutes,
  COUNT(CASE WHEN wl.performance_score >= 80 THEN 1 END) as high_performance_workouts,
  DATE_TRUNC('week', wl.completed_at) as week_start
FROM public.ai_routines r
LEFT JOIN public.workout_logs wl ON r.id = wl.routine_id
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY r.user_id, r.id, r.routine_name, DATE_TRUNC('week', wl.completed_at);

CREATE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  wl.routine_id,
  COUNT(*) as total_workouts,
  SUM(wl.skipped_steps_count) as total_skipped_steps,
  AVG(wl.skipped_steps_count) as avg_skipped_per_workout,
  COUNT(CASE WHEN wl.skipped_steps_count > 0 THEN 1 END) as workouts_with_skips,
  DATE_TRUNC('month', wl.completed_at) as month_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY wl.user_id, wl.routine_id, DATE_TRUNC('month', wl.completed_at);

CREATE VIEW public.muscle_group_weekly_analysis AS
SELECT 
  wl.user_id,
  wl.routine_id,
  jsonb_object_keys(wl.muscle_groups_trained) as muscle_group,
  COUNT(*) as times_trained,
  AVG((wl.muscle_groups_trained->jsonb_object_keys(wl.muscle_groups_trained))::numeric) as avg_intensity,
  DATE_TRUNC('week', wl.completed_at) as week_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '8 weeks'
  AND wl.muscle_groups_trained IS NOT NULL
GROUP BY wl.user_id, wl.routine_id, jsonb_object_keys(wl.muscle_groups_trained), DATE_TRUNC('week', wl.completed_at);

CREATE VIEW public.workout_intensity_distribution AS
SELECT 
  wl.user_id,
  wl.routine_id,
  CASE 
    WHEN wl.performance_score >= 90 THEN 'Very High'
    WHEN wl.performance_score >= 75 THEN 'High'
    WHEN wl.performance_score >= 60 THEN 'Moderate'
    WHEN wl.performance_score >= 40 THEN 'Low'
    ELSE 'Very Low'
  END as intensity_category,
  COUNT(*) as workout_count,
  AVG(wl.total_duration_minutes) as avg_duration,
  DATE_TRUNC('month', wl.completed_at) as month_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY wl.user_id, wl.routine_id, intensity_category, DATE_TRUNC('month', wl.completed_at);

-- 4. Recreate security functions with proper settings
CREATE OR REPLACE FUNCTION public.log_security_event(event_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    event_details,
    user_id,
    severity,
    created_at
  ) VALUES (
    COALESCE((event_data->>'type')::text, 'unknown'),
    event_data,
    COALESCE((event_data->>'user_id')::uuid, auth.uid()),
    COALESCE((event_data->>'severity')::text, 'medium'),
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback: try direct insert into security_logs if security_events doesn't exist
    INSERT INTO public.security_logs (
      event_type,
      details,
      user_id,
      severity,
      created_at
    ) VALUES (
      COALESCE((event_data->>'type')::text, 'unknown'),
      event_data::text,
      COALESCE((event_data->>'user_id')::uuid, auth.uid()),
      COALESCE((event_data->>'severity')::text, 'medium'),
      now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_violation(violation_type text, details text, metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    event_details,
    user_id,
    severity,
    created_at
  ) VALUES (
    violation_type,
    jsonb_build_object(
      'details', details,
      'metadata', metadata,
      'violation_type', violation_type
    ),
    auth.uid(),
    'high',
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback logging
    INSERT INTO public.security_logs (
      event_type,
      details,
      user_id,
      severity,
      created_at
    ) VALUES (
      violation_type,
      details,
      auth.uid(),
      'high',
      now()
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_security_event(event_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Basic validation for security event structure
  IF event_data IS NULL OR event_data = '{}'::jsonb THEN
    RETURN false;
  END IF;
  
  -- Check required fields
  IF NOT (event_data ? 'type') THEN
    RETURN false;
  END IF;
  
  -- Validate event type
  IF (event_data->>'type') NOT IN (
    'authentication_failure', 'suspicious_activity', 'data_access_violation',
    'input_validation_error', 'rate_limit_exceeded', 'unauthorized_access'
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;