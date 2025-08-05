-- Fix critical security vulnerabilities identified in security review
-- Phase 1: Database Security Hardening

-- 1. Create secure UUID validation function with proper search path
CREATE OR REPLACE FUNCTION public.validate_uuid_secure(input_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate UUID format
  IF input_value IS NULL OR input_value = '' THEN
    RETURN false;
  END IF;
  
  -- Check UUID format using regex
  IF input_value !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;
  
  -- Try to cast to UUID to ensure validity
  BEGIN
    PERFORM input_value::uuid;
    RETURN true;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;
END;
$$;

-- 2. Create secure logging function with proper search path
CREATE OR REPLACE FUNCTION public.log_security_event_secure(
  event_type_param text,
  event_details_param jsonb DEFAULT '{}',
  user_id_param uuid DEFAULT NULL,
  severity_param text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate inputs
  IF event_type_param IS NULL OR event_type_param = '' THEN
    RAISE EXCEPTION 'Event type cannot be null or empty';
  END IF;
  
  -- Insert security event with proper validation
  INSERT INTO public.security_events (
    event_type,
    event_details,
    user_id,
    severity,
    created_at
  ) VALUES (
    event_type_param,
    COALESCE(event_details_param, '{}'),
    user_id_param,
    COALESCE(severity_param, 'low'),
    now()
  );
END;
$$;

-- 3. Add proper constraint validation trigger for user_notifications
CREATE OR REPLACE FUNCTION public.validate_notification_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate user_id is a proper UUID
  IF NEW.user_id IS NULL OR NOT public.validate_uuid_secure(NEW.user_id::text) THEN
    RAISE EXCEPTION 'Invalid user_id provided: %', NEW.user_id;
  END IF;
  
  -- Validate notification type
  IF NEW.type IS NULL OR NEW.type NOT IN ('reminder', 'alert', 'update', 'achievement', 'social') THEN
    RAISE EXCEPTION 'Invalid notification type: %', NEW.type;
  END IF;
  
  -- Validate required fields
  IF NEW.title IS NULL OR LENGTH(trim(NEW.title)) = 0 THEN
    RAISE EXCEPTION 'Notification title cannot be empty';
  END IF;
  
  IF NEW.message IS NULL OR LENGTH(trim(NEW.message)) = 0 THEN
    RAISE EXCEPTION 'Notification message cannot be empty';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the validation trigger
DROP TRIGGER IF EXISTS validate_notification_trigger ON user_notifications;
CREATE TRIGGER validate_notification_trigger
  BEFORE INSERT OR UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_notification_before_insert();

-- 5. Update log_security_event function to use the secure version
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  event_details_param jsonb DEFAULT '{}',
  user_id_param uuid DEFAULT NULL,
  severity_param text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Call the secure logging function
  PERFORM public.log_security_event_secure(
    event_type_param,
    event_details_param,
    user_id_param,
    severity_param
  );
END;
$$;