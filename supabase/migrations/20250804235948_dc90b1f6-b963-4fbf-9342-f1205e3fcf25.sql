-- Security Fixes - Core Database Hardening
-- Focus on essential security improvements without problematic references

-- 1. Fix nullable user_id columns for security
-- Clean up any existing NULL values first
DELETE FROM public.ai_nudges WHERE user_id IS NULL;
DELETE FROM public.ai_predictions WHERE user_id IS NULL;
DELETE FROM public.coach_interactions WHERE user_id IS NULL;

-- Add NOT NULL constraints where missing (use conditional checks)
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

-- 2. Add security indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_security_events_user_id_created ON public.security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity_created ON public.security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);

-- 3. Add data integrity constraints
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

-- 4. Create enhanced security validation function
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

-- 5. Add trigger to validate role assignments
CREATE OR REPLACE FUNCTION public.check_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Use the validation function for INSERT and UPDATE operations
  IF NOT public.validate_role_assignment(NEW.user_id, NEW.role) THEN
    RAISE EXCEPTION 'Unauthorized role assignment attempt detected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;
CREATE TRIGGER validate_role_assignment_trigger
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.check_role_assignment();