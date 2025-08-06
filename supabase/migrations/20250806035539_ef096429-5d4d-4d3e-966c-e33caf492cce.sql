-- Security Cleanup Migration
-- 1. Create extensions schema and move pg_net
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- 2. Update security functions with proper search_path
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  event_details_param jsonb DEFAULT '{}'::jsonb,
  user_id_param uuid DEFAULT NULL,
  severity_param text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate severity
  IF severity_param NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level: %', severity_param;
  END IF;
  
  -- Validate user_id for non-system events
  IF user_id_param IS NULL AND event_type_param NOT LIKE '%system%' THEN
    RAISE EXCEPTION 'user_id cannot be null for non-system events';
  END IF;
  
  INSERT INTO public.security_events (
    event_type,
    event_details,
    user_id,
    severity
  ) VALUES (
    event_type_param,
    event_details_param,
    user_id_param,
    severity_param::severity_level
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_security_event(
  event_type_param text,
  user_id_param uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic validation rules
  IF event_type_param IS NULL OR LENGTH(event_type_param) = 0 THEN
    RETURN false;
  END IF;
  
  -- System events don't require user_id
  IF event_type_param LIKE '%system%' THEN
    RETURN true;
  END IF;
  
  -- User events require valid user_id
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_violation(
  violation_type_param text,
  violation_details_param jsonb DEFAULT '{}'::jsonb,
  user_id_param uuid DEFAULT NULL,
  severity_param text DEFAULT 'medium'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate severity
  IF severity_param NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level: %', severity_param;
  END IF;
  
  INSERT INTO public.security_violations (
    violation_type,
    violation_details,
    user_id,
    severity
  ) VALUES (
    violation_type_param,
    violation_details_param,
    user_id_param,
    severity_param::severity_level
  );
END;
$$;

-- 3. Create security_events table
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  severity severity_level DEFAULT 'low'::severity_level,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events"
ON public.security_events
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can insert security events"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- 4. Create security_violations table
CREATE TABLE IF NOT EXISTS public.security_violations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_type text NOT NULL,
  violation_details jsonb DEFAULT '{}'::jsonb,
  user_id uuid,
  severity severity_level DEFAULT 'medium'::severity_level,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_violations
CREATE POLICY "Admins can view all security violations"
ON public.security_violations
FOR SELECT
USING (auth.uid() IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can insert security violations"
ON public.security_violations
FOR INSERT
WITH CHECK (true);

-- 5. Drop and recreate SECURITY DEFINER views as RLS-compatible
DROP VIEW IF EXISTS public.workout_progress_analytics;
DROP VIEW IF EXISTS public.muscle_group_trends;
DROP VIEW IF EXISTS public.routine_performance_analytics;
DROP VIEW IF EXISTS public.workout_skipping_analysis;

-- Recreate as RLS-compatible views (without SECURITY DEFINER)
CREATE VIEW public.workout_progress_analytics AS
SELECT 
  wl.user_id,
  DATE_TRUNC('week', wl.created_at) as week_start,
  COUNT(*) as total_workouts,
  AVG(wl.performance_score) as avg_performance_score,
  SUM(wl.completed_exercises_count) as total_exercises_completed,
  AVG(wl.completed_exercises_count::numeric / NULLIF(wl.total_exercises_count, 0)) * 100 as completion_rate
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()
GROUP BY wl.user_id, DATE_TRUNC('week', wl.created_at)
ORDER BY week_start DESC;

CREATE VIEW public.muscle_group_trends AS
SELECT 
  el.user_id,
  el.muscle_group,
  DATE_TRUNC('month', el.created_at) as month_start,
  COUNT(*) as exercise_count,
  AVG(el.sets_completed) as avg_sets,
  AVG(el.reps_completed) as avg_reps
FROM public.exercise_logs el
WHERE el.user_id = auth.uid()
GROUP BY el.user_id, el.muscle_group, DATE_TRUNC('month', el.created_at)
ORDER BY month_start DESC, exercise_count DESC;

CREATE VIEW public.routine_performance_analytics AS
SELECT 
  wl.user_id,
  wl.routine_id,
  ar.routine_name,
  COUNT(*) as total_sessions,
  AVG(wl.performance_score) as avg_performance,
  AVG(wl.completed_exercises_count::numeric / NULLIF(wl.total_exercises_count, 0)) * 100 as avg_completion_rate,
  MAX(wl.created_at) as last_performed
FROM public.workout_logs wl
LEFT JOIN public.ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid()
GROUP BY wl.user_id, wl.routine_id, ar.routine_name
ORDER BY avg_performance DESC;

CREATE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  DATE_TRUNC('week', wl.created_at) as week_start,
  COUNT(*) as total_workouts,
  SUM(wl.skipped_steps_count) as total_skipped_steps,
  AVG(wl.skipped_steps_count) as avg_skipped_per_workout,
  (SUM(wl.skipped_steps_count)::numeric / NULLIF(SUM(wl.total_exercises_count), 0)) * 100 as skip_percentage
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()
GROUP BY wl.user_id, DATE_TRUNC('week', wl.created_at)
ORDER BY week_start DESC;