-- Final comprehensive security cleanup migration (corrected)
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

-- 3. Recreate views without SECURITY DEFINER (using actual table columns)
CREATE VIEW public.routine_performance_analytics AS
SELECT 
  r.user_id,
  r.id as routine_id,
  r.routine_name,
  COUNT(wl.id) as total_workouts,
  AVG(CASE WHEN wl.target_sets > 0 THEN (wl.sets_completed::float / wl.target_sets::float) * 100 ELSE 0 END) as avg_completion_percentage,
  AVG(wl.duration_seconds) as avg_duration_seconds,
  COUNT(CASE WHEN wl.sets_completed >= wl.target_sets THEN 1 END) as completed_workouts,
  DATE_TRUNC('week', wl.completed_at) as week_start
FROM public.ai_routines r
LEFT JOIN public.workout_logs wl ON r.id = wl.routine_id
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY r.user_id, r.id, r.routine_name, DATE_TRUNC('week', wl.completed_at);

CREATE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  wl.routine_id,
  COUNT(*) as total_exercises,
  SUM(COALESCE(wl.skipped_sets, 0)) as total_skipped_sets,
  AVG(COALESCE(wl.skipped_sets, 0)) as avg_skipped_per_exercise,
  COUNT(CASE WHEN COALESCE(wl.skipped_sets, 0) > 0 THEN 1 END) as exercises_with_skips,
  DATE_TRUNC('month', wl.completed_at) as month_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY wl.user_id, wl.routine_id, DATE_TRUNC('month', wl.completed_at);

CREATE VIEW public.muscle_group_weekly_analysis AS
SELECT 
  wl.user_id,
  wl.routine_id,
  wl.exercise_type as muscle_group,
  COUNT(*) as times_trained,
  AVG(wl.sets_completed) as avg_sets_completed,
  AVG(wl.duration_seconds) as avg_duration_seconds,
  DATE_TRUNC('week', wl.completed_at) as week_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '8 weeks'
  AND wl.exercise_type IS NOT NULL
GROUP BY wl.user_id, wl.routine_id, wl.exercise_type, DATE_TRUNC('week', wl.completed_at);

CREATE VIEW public.workout_intensity_distribution AS
SELECT 
  wl.user_id,
  wl.routine_id,
  CASE 
    WHEN wl.sets_completed >= wl.target_sets THEN 'Completed'
    WHEN wl.sets_completed >= (wl.target_sets * 0.75) THEN 'High Completion'
    WHEN wl.sets_completed >= (wl.target_sets * 0.5) THEN 'Moderate Completion'
    ELSE 'Low Completion'
  END as completion_category,
  COUNT(*) as exercise_count,
  AVG(wl.duration_seconds) as avg_duration_seconds,
  DATE_TRUNC('month', wl.completed_at) as month_start
FROM public.workout_logs wl
WHERE wl.completed_at >= CURRENT_DATE - INTERVAL '6 months'
  AND wl.target_sets > 0
GROUP BY wl.user_id, wl.routine_id, completion_category, DATE_TRUNC('month', wl.completed_at);

-- 4. Recreate security functions with proper settings
CREATE OR REPLACE FUNCTION public.log_security_event(event_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Simple logging that doesn't depend on specific tables
  RAISE LOG 'Security Event: %', event_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_violation(violation_type text, details text, metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Simple logging that doesn't depend on specific tables
  RAISE LOG 'Security Violation - Type: %, Details: %, Metadata: %', violation_type, details, metadata;
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