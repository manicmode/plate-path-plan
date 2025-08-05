-- ROLLBACK MIGRATION: Undo all security changes from the Aug 4 loop
-- This restores the database to its clean state before 4:00 PM

BEGIN;

-- 1. Drop all new functions created today
DROP FUNCTION IF EXISTS public.validate_uuid_secure(text) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event_secure(text, jsonb, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_notification_before_insert() CASCADE;
DROP FUNCTION IF EXISTS public.validate_uuid_input_secure(text, text) CASCADE;

-- 2. Drop the new trigger
DROP TRIGGER IF EXISTS validate_notification_trigger ON user_notifications;

-- 3. Restore original version of log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param text,
  event_details_param jsonb DEFAULT '{}',
  user_id_param uuid DEFAULT NULL,
  severity_param text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- 4. Restore original version of validate_security_event
CREATE OR REPLACE FUNCTION public.validate_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.event_type NOT LIKE 'system_%' THEN
    RAISE EXCEPTION 'user_id cannot be null for non-system events';
  END IF;

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
$$;

-- 5. Clean up security event logs from today
DELETE FROM security_events
WHERE event_type IN (
  'security_definer_view_detected',
  'system_security_upgrade',
  'database_security_hardening'
)
AND created_at::date = CURRENT_DATE;

COMMIT;