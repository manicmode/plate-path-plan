-- Phase 1: Critical Security Fixes - Database Security
-- Fix 1: Remove SECURITY DEFINER from functions that don't need elevated privileges
-- Fix 2: Secure nullable user_id columns with NOT NULL constraints
-- Fix 3: Add missing WITH CHECK expressions to RLS policies

-- First, clean up any NULL user_id records before adding constraints
DELETE FROM food_recognitions WHERE user_id IS NULL;

-- Add NOT NULL constraints to user_id columns that should require authentication
ALTER TABLE food_recognitions ALTER COLUMN user_id SET NOT NULL;

-- Update RLS policies to remove permissive NULL conditions and add missing WITH CHECK
-- Fix food_recognitions policies
DROP POLICY IF EXISTS "Users can create food recognitions" ON food_recognitions;
CREATE POLICY "Users can create food recognitions" 
ON food_recognitions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own food recognitions" ON food_recognitions;
CREATE POLICY "Users can view their own food recognitions" 
ON food_recognitions FOR SELECT 
USING (auth.uid() = user_id);

-- Add missing UPDATE and DELETE policies for food_recognitions
CREATE POLICY "Users can update their own food recognitions" 
ON food_recognitions FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food recognitions" 
ON food_recognitions FOR DELETE 
USING (auth.uid() = user_id);

-- Fix SECURITY DEFINER issues by removing it from functions that don't need elevated privileges
-- Keep SECURITY DEFINER only for functions that truly need to bypass RLS or access auth schema

-- Remove SECURITY DEFINER from calculation functions (they don't need elevated privileges)
CREATE OR REPLACE FUNCTION public.calculate_performance_score(completed_sets integer, total_sets integer, completed_exercises integer, total_exercises integer, skipped_steps integer, difficulty_rating text)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  completion_score NUMERIC;
  difficulty_bonus NUMERIC;
  skip_penalty NUMERIC;
  final_score NUMERIC;
BEGIN
  -- Base completion score (0-70 points)
  completion_score := LEAST(70, (completed_sets::NUMERIC / NULLIF(total_sets, 0)) * 50 + 
                                (completed_exercises::NUMERIC / NULLIF(total_exercises, 0)) * 20);
  
  -- Difficulty bonus (0-20 points)
  difficulty_bonus := CASE 
    WHEN difficulty_rating = 'too_hard' THEN 20
    WHEN difficulty_rating = 'just_right' THEN 15
    WHEN difficulty_rating = 'too_easy' THEN 5
    ELSE 10
  END;
  
  -- Skip penalty (0-10 points deduction)
  skip_penalty := LEAST(10, skipped_steps * 2);
  
  -- Calculate final score (0-100)
  final_score := GREATEST(0, completion_score + difficulty_bonus - skip_penalty);
  
  RETURN ROUND(final_score, 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_recovery_score(meditation_count integer, breathing_count integer, yoga_count integer, sleep_count integer, stretching_count integer, muscle_recovery_count integer, streak_bonus numeric DEFAULT 1.0)
RETURNS numeric
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN (
    meditation_count * 3 +
    breathing_count * 2 +
    yoga_count * 4 +
    sleep_count * 2 +
    stretching_count * 2 +
    muscle_recovery_count * 3
  ) * streak_bonus;
END;
$function$;

-- Keep SECURITY DEFINER for functions that need to access auth schema or bypass RLS
-- but ensure they have proper security checks

-- Add validation trigger for security events to prevent constraint violations
CREATE OR REPLACE FUNCTION public.validate_security_event_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Validate user_id is a proper UUID (not "undefined" string)
  IF NEW.user_id IS NOT NULL AND NEW.user_id::text = 'undefined' THEN
    RAISE EXCEPTION 'Invalid user_id: undefined string not allowed';
  END IF;
  
  -- Validate user_id is not null for authenticated events
  IF NEW.user_id IS NULL AND NEW.event_type NOT LIKE 'system_%' THEN
    RAISE EXCEPTION 'user_id cannot be null for non-system events';
  END IF;
  
  -- Validate event_type is not empty
  IF NEW.event_type IS NULL OR trim(NEW.event_type) = '' THEN
    RAISE EXCEPTION 'event_type cannot be null or empty';
  END IF;
  
  -- Validate severity is one of allowed values
  IF NEW.severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level: %', NEW.severity;
  END IF;
  
  -- Log critical events immediately
  IF NEW.severity = 'critical' THEN
    PERFORM pg_notify('critical_security_event', 
      json_build_object(
        'event_type', NEW.event_type,
        'user_id', NEW.user_id,
        'created_at', NEW.created_at
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Replace the existing trigger
DROP TRIGGER IF EXISTS validate_security_event_trigger ON security_events;
CREATE TRIGGER validate_security_event_trigger
  BEFORE INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_security_event_enhanced();

-- Add indexes for security monitoring performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON security_events(user_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_type_created 
ON security_events(event_type, created_at DESC);

-- Add constraint to prevent "undefined" string in UUID columns
ALTER TABLE security_events ADD CONSTRAINT check_user_id_not_undefined 
CHECK (user_id IS NULL OR user_id::text != 'undefined');

-- Create enhanced security monitoring function for admins
CREATE OR REPLACE FUNCTION public.get_security_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  result jsonb;
  is_admin boolean := false;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  -- Get security statistics for the last 24 hours
  SELECT jsonb_build_object(
    'critical_alerts', COUNT(*) FILTER (WHERE severity = 'critical'),
    'high_alerts', COUNT(*) FILTER (WHERE severity = 'high'),
    'medium_alerts', COUNT(*) FILTER (WHERE severity = 'medium'),
    'total_events', COUNT(*),
    'top_event_types', (
      SELECT jsonb_agg(jsonb_build_object('type', event_type, 'count', count))
      FROM (
        SELECT event_type, COUNT(*) as count
        FROM security_events 
        WHERE created_at >= now() - interval '24 hours'
        GROUP BY event_type
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) top_events
    ),
    'last_updated', now()
  ) INTO result
  FROM security_events
  WHERE created_at >= now() - interval '24 hours';
  
  RETURN result;
END;
$function$;