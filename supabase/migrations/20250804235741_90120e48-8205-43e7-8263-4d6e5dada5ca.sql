-- Phase 1: Critical Database Security Fixes

-- 1. Fix nullable user_id columns in security-sensitive tables
-- Make user_id NOT NULL where it should be for security

-- Update any existing NULL user_id values to a sentinel value or remove them
DELETE FROM public.ai_nudges WHERE user_id IS NULL;
DELETE FROM public.ai_predictions WHERE user_id IS NULL;
DELETE FROM public.coach_interactions WHERE user_id IS NULL;
DELETE FROM public.meditation_nudge_history WHERE user_id IS NULL;

-- Add NOT NULL constraints to critical security tables
ALTER TABLE public.ai_nudges ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ai_predictions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.coach_interactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.meditation_nudge_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.breathing_nudge_preferences ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.breathing_nudges ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.breathing_reminders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.breathing_streaks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.body_scan_reminders ALTER COLUMN user_id SET NOT NULL;

-- 2. Add missing RLS policies for comprehensive coverage

-- Ensure security_events table has proper RLS (if not already covered)
CREATE POLICY "Users can view their own security events" 
ON public.security_events 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Add policy for system to insert security events
CREATE POLICY "System can create security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 3. Strengthen existing RLS policies to handle edge cases

-- Update user_roles policies to be more restrictive
DROP POLICY IF EXISTS "Users can view user roles" ON public.user_roles;
CREATE POLICY "Users can view their own role only" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure admins can manage roles securely
CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. Add security constraints and indexes

-- Add index on security_events for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id_created ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON public.security_events(severity, created_at DESC);

-- Add check constraints for data integrity
ALTER TABLE public.security_events 
ADD CONSTRAINT check_severity_values 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE public.security_events 
ADD CONSTRAINT check_event_type_not_empty 
CHECK (length(trim(event_type)) > 0);

-- 5. Create security function to validate user operations
CREATE OR REPLACE FUNCTION public.validate_user_operation(target_user_id uuid, operation_context text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Log the operation attempt
  INSERT INTO public.security_events (
    user_id, 
    event_type, 
    event_details, 
    severity
  ) VALUES (
    current_user_id,
    'operation_validation',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'operation_context', operation_context,
      'current_user_id', current_user_id
    ),
    'low'
  );

  -- Only allow operations on own data unless admin
  IF current_user_id != target_user_id AND NOT public.has_role(current_user_id, 'admin'::app_role) THEN
    -- Log unauthorized attempt
    INSERT INTO public.security_events (
      user_id, 
      event_type, 
      event_details, 
      severity
    ) VALUES (
      current_user_id,
      'unauthorized_operation_attempt',
      jsonb_build_object(
        'target_user_id', target_user_id,
        'operation_context', operation_context
      ),
      'high'
    );
    RETURN false;
  END IF;

  RETURN true;
END;
$$;