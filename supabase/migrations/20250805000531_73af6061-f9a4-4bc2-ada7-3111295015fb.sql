-- Fix critical security vulnerabilities - Final cleanup
-- 1. Clean up null user_id values and apply constraints
DELETE FROM food_recognitions WHERE user_id IS NULL;
DELETE FROM nutrition_logs WHERE user_id IS NULL;

-- Apply NOT NULL constraints
ALTER TABLE food_recognitions 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE nutrition_logs 
ALTER COLUMN user_id SET NOT NULL;

-- 2. Add security indexes (skip if exist)
CREATE INDEX IF NOT EXISTS idx_security_events_user_severity 
ON security_events(user_id, severity, created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type 
ON security_events(event_type, created_at);

-- 3. Create security event validation function with proper notification
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