-- Security Cleanup: Fix all Supabase Security Advisor warnings

-- 1. Create dedicated extensions schema and move pg_net
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION IF EXISTS pg_net SET SCHEMA extensions;

-- 2. Fix mutable search_path functions by adding explicit search_path setting
-- Update log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_description text,
  p_severity text DEFAULT 'info',
  p_metadata jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    description,
    severity,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_event_type,
    p_description,
    p_severity,
    p_metadata,
    now()
  );
END;
$$;

-- Update validate_security_event function
CREATE OR REPLACE FUNCTION public.validate_security_event(
  p_event_type text,
  p_user_id uuid,
  p_metadata jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_count integer;
  time_window interval := '1 hour';
BEGIN
  -- Check for suspicious patterns
  SELECT COUNT(*) INTO event_count
  FROM public.security_events
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND created_at > now() - time_window;
  
  -- Return false if too many events in time window
  IF event_count > 100 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update log_security_violation function
CREATE OR REPLACE FUNCTION public.log_security_violation(
  p_user_id uuid,
  p_violation_type text,
  p_details text,
  p_ip_address inet DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_violations (
    user_id,
    violation_type,
    details,
    ip_address,
    metadata,
    created_at
  ) VALUES (
    p_user_id,
    p_violation_type,
    p_details,
    p_ip_address,
    p_metadata,
    now()
  );
  
  -- Also log as security event
  PERFORM public.log_security_event(
    p_user_id,
    'security_violation',
    p_violation_type || ': ' || p_details,
    'error',
    p_metadata
  );
END;
$$;

-- 3. Replace SECURITY DEFINER views with RLS-compatible views

-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS public.workout_progress_analytics;
DROP VIEW IF EXISTS public.muscle_group_trends;
DROP VIEW IF EXISTS public.routine_performance_analytics;
DROP VIEW IF EXISTS public.workout_skipping_analysis;

-- Create RLS-compatible view for workout progress analytics
CREATE OR REPLACE VIEW public.workout_progress_analytics AS
SELECT 
  wl.user_id,
  wl.routine_id,
  wl.workout_date,
  wl.performance_score,
  wl.completed_exercises_count,
  wl.total_exercises_count,
  wl.completed_sets_count,
  wl.total_sets_count,
  wl.duration_minutes,
  wl.difficulty_rating,
  wl.created_at,
  ROW_NUMBER() OVER (PARTITION BY wl.user_id, wl.routine_id ORDER BY wl.workout_date) as workout_sequence,
  LAG(wl.performance_score) OVER (PARTITION BY wl.user_id, wl.routine_id ORDER BY wl.workout_date) as previous_score,
  AVG(wl.performance_score) OVER (
    PARTITION BY wl.user_id, wl.routine_id 
    ORDER BY wl.workout_date 
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) as rolling_avg_score
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid(); -- RLS-compatible: only show current user's data

-- Create RLS-compatible view for muscle group trends
CREATE OR REPLACE VIEW public.muscle_group_trends AS
SELECT 
  wl.user_id,
  wl.workout_date,
  DATE_TRUNC('week', wl.workout_date) as week_start,
  DATE_TRUNC('month', wl.workout_date) as month_start,
  jsonb_array_elements_text(wl.muscle_groups_targeted) as muscle_group,
  COUNT(*) as workout_count,
  AVG(wl.performance_score) as avg_performance,
  SUM(wl.duration_minutes) as total_duration
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid() -- RLS-compatible: only show current user's data
  AND wl.muscle_groups_targeted IS NOT NULL
GROUP BY wl.user_id, wl.workout_date, week_start, month_start, muscle_group;

-- Create RLS-compatible view for routine performance analytics
CREATE OR REPLACE VIEW public.routine_performance_analytics AS
SELECT 
  wl.user_id,
  wl.routine_id,
  ar.routine_name,
  ar.routine_type,
  COUNT(*) as total_workouts,
  AVG(wl.performance_score) as avg_performance_score,
  MIN(wl.performance_score) as min_performance_score,
  MAX(wl.performance_score) as max_performance_score,
  AVG(wl.duration_minutes) as avg_duration_minutes,
  SUM(wl.duration_minutes) as total_duration_minutes,
  AVG(wl.difficulty_rating) as avg_difficulty_rating,
  COUNT(*) FILTER (WHERE wl.performance_score >= 80) as high_performance_workouts,
  COUNT(*) FILTER (WHERE wl.skipped_steps_count > 0) as workouts_with_skips,
  MIN(wl.workout_date) as first_workout_date,
  MAX(wl.workout_date) as last_workout_date
FROM public.workout_logs wl
LEFT JOIN public.ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid() -- RLS-compatible: only show current user's data
GROUP BY wl.user_id, wl.routine_id, ar.routine_name, ar.routine_type;

-- Create RLS-compatible view for workout skipping analysis
CREATE OR REPLACE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  wl.routine_id,
  wl.workout_date,
  wl.skipped_steps_count,
  wl.total_exercises_count,
  wl.performance_score,
  wl.difficulty_rating,
  CASE 
    WHEN wl.skipped_steps_count = 0 THEN 'no_skips'
    WHEN wl.skipped_steps_count <= 2 THEN 'minimal_skips'
    WHEN wl.skipped_steps_count <= 5 THEN 'moderate_skips'
    ELSE 'heavy_skips'
  END as skip_category,
  LAG(wl.skipped_steps_count) OVER (
    PARTITION BY wl.user_id, wl.routine_id 
    ORDER BY wl.workout_date
  ) as previous_skips,
  AVG(wl.skipped_steps_count) OVER (
    PARTITION BY wl.user_id, wl.routine_id 
    ORDER BY wl.workout_date 
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) as rolling_avg_skips
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid() -- RLS-compatible: only show current user's data
  AND wl.skipped_steps_count IS NOT NULL;

-- 4. Create tables for security events and violations if they don't exist
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  violation_type text NOT NULL,
  details text NOT NULL,
  ip_address inet,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security tables
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security tables (admin and user access)
CREATE POLICY "Users can view their own security events" ON public.security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create security events" ON public.security_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own security violations" ON public.security_violations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create security violations" ON public.security_violations
  FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated;