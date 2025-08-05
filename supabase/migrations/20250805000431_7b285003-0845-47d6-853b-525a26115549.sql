-- Fix critical security vulnerabilities
-- 1. Drop security definer views that bypass RLS
DROP VIEW IF EXISTS security_definer_view_1;
DROP VIEW IF EXISTS security_definer_view_2; 
DROP VIEW IF EXISTS security_definer_view_3;

-- 2. Fix nullable user_id columns for security
ALTER TABLE food_recognitions 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE nutrition_logs 
ALTER COLUMN user_id SET NOT NULL;

-- 3. Add critical security indexes
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

-- 5. Update functions to have secure search paths
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

-- 6. Create security event validation function
CREATE OR REPLACE FUNCTION validate_security_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate user_id is not null for authenticated events
  IF NEW.user_id IS NULL AND NEW.event_type NOT LIKE 'system_%' THEN
    RAISE EXCEPTION 'user_id cannot be null for non-system events';
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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- Create trigger for security event validation
DROP TRIGGER IF EXISTS trigger_validate_security_event ON security_events;
CREATE TRIGGER trigger_validate_security_event
  BEFORE INSERT ON security_events
  FOR EACH ROW
  EXECUTE FUNCTION validate_security_event();