-- Critical Security Fixes - Phase 1
-- Fix remaining SECURITY DEFINER views and strengthen database security

-- 1. First, let's check what SECURITY DEFINER views remain and fix them
-- Drop and recreate views without SECURITY DEFINER

-- Check for any remaining problematic views and fix them
DROP VIEW IF EXISTS public.workout_skipping_analysis CASCADE;
DROP VIEW IF EXISTS public.workout_progress_analytics CASCADE; 
DROP VIEW IF EXISTS public.muscle_group_trends CASCADE;

-- Recreate views without SECURITY DEFINER, using proper RLS instead
CREATE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  COUNT(*) as total_workouts,
  COUNT(CASE WHEN wl.skipped_steps_count > 0 THEN 1 END) as workouts_with_skips,
  AVG(wl.skipped_steps_count) as avg_skipped_steps,
  AVG(wl.performance_score) as avg_performance_score
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()  -- Use RLS instead of SECURITY DEFINER
GROUP BY wl.user_id;

CREATE VIEW public.workout_progress_analytics AS
SELECT 
  wl.user_id,
  DATE_TRUNC('week', wl.created_at) as week_start,
  COUNT(*) as workouts_completed,
  AVG(wl.performance_score) as avg_performance,
  AVG(wl.total_sets_count) as avg_total_sets,
  AVG(wl.completed_sets_count) as avg_completed_sets
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()  -- Use RLS instead of SECURITY DEFINER
GROUP BY wl.user_id, DATE_TRUNC('week', wl.created_at)
ORDER BY week_start DESC;

CREATE VIEW public.muscle_group_trends AS
SELECT 
  wl.user_id,
  wl.muscle_groups_targeted,
  COUNT(*) as workout_count,
  AVG(wl.performance_score) as avg_performance,
  MAX(wl.created_at) as last_workout_date
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()  -- Use RLS instead of SECURITY DEFINER
  AND wl.muscle_groups_targeted IS NOT NULL
GROUP BY wl.user_id, wl.muscle_groups_targeted;

-- Enable RLS on these views
ALTER VIEW public.workout_skipping_analysis OWNER TO authenticated;
ALTER VIEW public.workout_progress_analytics OWNER TO authenticated;
ALTER VIEW public.muscle_group_trends OWNER TO authenticated;

-- 2. Fix nullable user_id columns that are critical for security
-- Only modify tables that don't already have NOT NULL constraints

-- Clean up any existing NULL values first
DELETE FROM public.ai_nudges WHERE user_id IS NULL;
DELETE FROM public.ai_predictions WHERE user_id IS NULL;
DELETE FROM public.coach_interactions WHERE user_id IS NULL;

-- Add NOT NULL constraints where missing
DO $$
BEGIN
  -- Check and add NOT NULL constraint for ai_nudges if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_nudges' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.ai_nudges ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Check and add NOT NULL constraint for ai_predictions if not exists  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_predictions' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.ai_predictions ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Check and add NOT NULL constraint for coach_interactions if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'coach_interactions' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.coach_interactions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 3. Add security indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_security_events_user_id_created ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON public.security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);

-- 4. Add data integrity constraints
DO $$
BEGIN
  -- Add severity check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_severity_values'
    AND table_name = 'security_events'
  ) THEN
    ALTER TABLE public.security_events 
    ADD CONSTRAINT check_severity_values 
    CHECK (severity IN ('low', 'medium', 'high', 'critical'));
  END IF;

  -- Add event_type check constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'check_event_type_not_empty'
    AND table_name = 'security_events'
  ) THEN
    ALTER TABLE public.security_events 
    ADD CONSTRAINT check_event_type_not_empty 
    CHECK (length(trim(event_type)) > 0);
  END IF;
END $$;

-- 5. Strengthen user role management
-- Create a secure function to validate role assignments
CREATE OR REPLACE FUNCTION public.validate_role_assignment(target_user_id uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_user_role app_role;
BEGIN
  -- Get current user's highest role
  SELECT role INTO current_user_role 
  FROM public.user_roles 
  WHERE user_id = current_user_id 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'moderator' THEN 2 
      WHEN 'user' THEN 3 
    END 
  LIMIT 1;

  -- Log the role assignment attempt
  INSERT INTO public.security_events (
    user_id, 
    event_type, 
    event_details, 
    severity
  ) VALUES (
    current_user_id,
    'role_assignment_attempt',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'new_role', new_role,
      'current_user_role', current_user_role
    ),
    'medium'
  );

  -- Only admins can assign roles
  IF current_user_role != 'admin' THEN
    INSERT INTO public.security_events (
      user_id, 
      event_type, 
      event_details, 
      severity
    ) VALUES (
      current_user_id,
      'unauthorized_role_assignment',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'attempted_role', new_role
      ),
      'high'
    );
    RETURN false;
  END IF;

  -- Prevent users from changing their own role
  IF current_user_id = target_user_id THEN
    INSERT INTO public.security_events (
      user_id, 
      event_type, 
      event_details, 
      severity
    ) VALUES (
      current_user_id,
      'self_role_modification_attempt',
      jsonb_build_object(
        'attempted_role', new_role
      ),
      'critical'
    );
    RETURN false;
  END IF;

  RETURN true;
END;
$$;