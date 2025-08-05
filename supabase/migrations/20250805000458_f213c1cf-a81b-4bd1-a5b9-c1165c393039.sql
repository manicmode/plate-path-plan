-- Fix critical security vulnerabilities - Phase 1: Clean existing data
-- 1. Clean up null user_id values in food_recognitions table
-- Delete records with null user_id as they're security risks
DELETE FROM food_recognitions WHERE user_id IS NULL;

-- Clean up null user_id values in nutrition_logs if any exist
DELETE FROM nutrition_logs WHERE user_id IS NULL;

-- 2. Now apply NOT NULL constraints safely
ALTER TABLE food_recognitions 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE nutrition_logs 
ALTER COLUMN user_id SET NOT NULL;

-- 3. Add critical security indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON security_events(user_id, severity, created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type 
ON security_events(event_type, created_at);

-- 4. Add data integrity constraints
ALTER TABLE security_events 
ADD CONSTRAINT check_severity_valid 
CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE security_events 
ADD CONSTRAINT check_event_type_not_empty 
CHECK (length(trim(event_type)) > 0);

-- 5. Update existing functions to have secure search paths
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'moderator' THEN 2 
      WHEN 'user' THEN 3 
    END 
  LIMIT 1
$$;