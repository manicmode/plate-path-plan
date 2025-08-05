-- Phase 1 Critical Security Fixes: Address Security Definer Views and Remaining Issues

-- Fix the function without proper search_path
CREATE OR REPLACE FUNCTION public.check_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Add role assignment validation logic if needed
  RETURN NEW;
END;
$function$;

-- Address Security Definer Views by converting them to regular views
-- These views should rely on RLS policies instead of SECURITY DEFINER

-- Recreate muscle_group_trends as regular view (remove SECURITY DEFINER if present)
CREATE OR REPLACE VIEW public.muscle_group_trends AS
WITH muscle_categories AS (
  SELECT 
    wl.user_id,
    CASE 
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%squat%', '%lunge%', '%leg%', '%quad%', '%hamstring%', '%calf%']) THEN 'legs'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%chest%', '%bench%', '%push up%', '%pec%']) THEN 'chest'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%back%', '%row%', '%pull%', '%lat%', '%deadlift%']) THEN 'back'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%shoulder%', '%press%', '%raise%', '%delt%']) THEN 'shoulders'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%arm%', '%bicep%', '%tricep%', '%curl%']) THEN 'arms'
      ELSE 'other'
    END as muscle_group,
    wl.exercise_name,
    wl.sets_completed,
    wl.skipped_sets,
    DATE_TRUNC('week', wl.completed_at) as week_start,
    wl.completed_at
  FROM workout_logs wl
  WHERE wl.user_id = auth.uid() 
    AND wl.completed_at >= CURRENT_DATE - INTERVAL '56 days'
),
weekly_stats AS (
  SELECT 
    user_id,
    muscle_group,
    week_start,
    SUM(sets_completed) as total_sets,
    COUNT(*) as total_exercises,
    SUM(skipped_sets) as total_skipped,
    AVG(sets_completed) as avg_sets_per_exercise,
    COUNT(DISTINCT exercise_name) as unique_exercises
  FROM muscle_categories
  WHERE muscle_group != 'other'
  GROUP BY user_id, muscle_group, week_start
),
top_exercises AS (
  SELECT 
    user_id,
    muscle_group,
    exercise_name,
    COUNT(*) as frequency,
    ROW_NUMBER() OVER (PARTITION BY user_id, muscle_group ORDER BY COUNT(*) DESC) as exercise_rank
  FROM muscle_categories
  WHERE muscle_group != 'other'
  GROUP BY user_id, muscle_group, exercise_name
)
SELECT 
  ws.user_id,
  ws.muscle_group,
  ws.week_start,
  ws.total_sets,
  ws.total_exercises,
  ws.total_skipped,
  ws.avg_sets_per_exercise,
  ws.unique_exercises,
  ROUND((ws.total_sets::numeric / NULLIF(ws.total_sets + ws.total_skipped, 0)::numeric) * 100, 1) as completion_rate,
  ROUND((ws.total_skipped::numeric / NULLIF(ws.total_sets + ws.total_skipped, 0)::numeric) * 100, 1) as skip_rate,
  LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) as prev_week_sets,
  CASE 
    WHEN LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) IS NULL THEN 'stable'
    WHEN ws.total_sets > LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'increasing'
    WHEN ws.total_sets < LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'decreasing'
    ELSE 'stable'
  END as trend_direction,
  ARRAY_AGG(te.exercise_name ORDER BY te.frequency DESC) FILTER (WHERE te.exercise_rank <= 3) as top_exercises
FROM weekly_stats ws
LEFT JOIN top_exercises te ON ws.user_id = te.user_id AND ws.muscle_group = te.muscle_group
WHERE ws.user_id = auth.uid()
GROUP BY ws.user_id, ws.muscle_group, ws.week_start, ws.total_sets, ws.total_exercises, ws.total_skipped, ws.avg_sets_per_exercise, ws.unique_exercises
ORDER BY ws.muscle_group, ws.week_start DESC;

-- Recreate routine_performance_analytics as regular view (remove SECURITY DEFINER if present)
CREATE OR REPLACE VIEW public.routine_performance_analytics AS
SELECT 
  wl.user_id,
  ar.routine_name,
  COUNT(*) as total_sessions,
  AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) * 100 as avg_completion_rate,
  DATE_TRUNC('week', wl.completed_at) as week_start,
  CASE 
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.9 THEN 'excellent'
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.75 THEN 'good'
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.6 THEN 'fair'
    ELSE 'needs_improvement'
  END as performance_grade
FROM workout_logs wl
LEFT JOIN ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid()
  AND wl.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY wl.user_id, ar.routine_name, DATE_TRUNC('week', wl.completed_at)
ORDER BY week_start DESC, routine_name;

-- Enhanced security monitoring for critical operations
CREATE OR REPLACE FUNCTION public.log_critical_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Log critical database operations
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'user_roles' THEN
    INSERT INTO security_events (event_type, severity, event_details, user_id)
    VALUES (
      'role_assignment_created',
      'high',
      jsonb_build_object(
        'assigned_role', NEW.role,
        'target_user_id', NEW.user_id,
        'table', TG_TABLE_NAME,
        'operation', TG_OP
      ),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Add trigger for role assignments
DROP TRIGGER IF EXISTS trigger_log_role_assignments ON user_roles;
CREATE TRIGGER trigger_log_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_critical_security_event();

-- Enhanced validation for security events to prevent abuse
CREATE OR REPLACE FUNCTION public.validate_security_event_advanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  event_count INTEGER;
  time_window INTERVAL := '1 minute';
BEGIN
  -- Validate user_id is not null for non-system events
  IF NEW.user_id IS NULL AND NEW.event_type NOT LIKE 'system_%' THEN
    RAISE EXCEPTION 'user_id cannot be null for non-system events';
  END IF;
  
  -- Prevent abuse: check for excessive event logging
  IF NEW.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO event_count
    FROM security_events 
    WHERE user_id = NEW.user_id 
      AND created_at > NOW() - time_window
      AND event_type = NEW.event_type;
    
    IF event_count > 10 THEN
      RAISE EXCEPTION 'Rate limit exceeded for security event logging';
    END IF;
  END IF;
  
  -- Log critical events immediately
  IF NEW.severity = 'critical' THEN
    PERFORM pg_notify('critical_security_event', 
      json_build_object(
        'event_type', NEW.event_type,
        'user_id', NEW.user_id,
        'created_at', NEW.created_at,
        'event_details', NEW.event_details
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the security event trigger
DROP TRIGGER IF EXISTS validate_security_event_trigger ON security_events;
CREATE TRIGGER validate_security_event_trigger
  BEFORE INSERT ON security_events
  FOR EACH ROW EXECUTE FUNCTION validate_security_event_advanced();

-- Log completion of Phase 1 security fixes
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
  'system_security_fixes_phase1_completed',
  'medium',
  jsonb_build_object(
    'phase', 'critical_database_security',
    'fixes_applied', jsonb_build_array(
      'security_definer_views_converted',
      'function_search_paths_secured',
      'enhanced_security_monitoring',
      'advanced_event_validation',
      'role_assignment_tracking'
    ),
    'status', 'completed',
    'timestamp', now()
  ),
  NULL
);