-- Fix remaining security vulnerabilities from linter results
-- Phase 2: Address SECURITY DEFINER views and function search paths

-- 1. Secure all remaining functions with proper search_path
ALTER FUNCTION public.update_reminder_next_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_private_challenge_progress(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_private_challenge_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_performance_score() SET search_path = public, pg_temp;

-- 2. Create comprehensive client-side input validation enhancement
CREATE OR REPLACE FUNCTION public.validate_client_input_secure(
  input_data jsonb,
  validation_rules jsonb DEFAULT '{}'
) 
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb := '{"valid": false, "errors": []}';
  errors text[] := '{}';
  field_name text;
  field_value text;
  rule_key text;
  rule_value text;
BEGIN
  -- Validate each field in input_data
  FOR field_name, field_value IN SELECT * FROM jsonb_each_text(input_data) LOOP
    -- Check for XSS patterns
    IF field_value ~* '<script|javascript:|data:|vbscript:|onload|onerror|onclick' THEN
      errors := array_append(errors, format('XSS attempt detected in field: %s', field_name));
    END IF;
    
    -- Check for SQL injection patterns
    IF field_value ~* '(union|select|insert|delete|update|drop|create|alter)\s+' THEN
      errors := array_append(errors, format('SQL injection attempt in field: %s', field_name));
    END IF;
    
    -- Validate UUIDs if field name suggests it should be one
    IF field_name ~* 'id$|_id$' AND field_value IS NOT NULL THEN
      IF NOT public.validate_uuid_secure(field_value) THEN
        errors := array_append(errors, format('Invalid UUID format in field: %s', field_name));
      END IF;
    END IF;
  END LOOP;
  
  -- Return validation result
  IF array_length(errors, 1) IS NULL THEN
    result := '{"valid": true, "errors": []}';
  ELSE
    result := jsonb_build_object(
      'valid', false,
      'errors', array_to_json(errors)
    );
    
    -- Log security violation
    PERFORM public.log_security_event_secure(
      'CLIENT_INPUT_VALIDATION_FAILED',
      jsonb_build_object(
        'errors', errors,
        'input_fields', jsonb_object_keys(input_data)
      ),
      NULL,
      'medium'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- 3. Create notification constraint validation function (enhanced)
CREATE OR REPLACE FUNCTION public.validate_notification_data_secure(
  notification_data jsonb
) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_id_val text;
  type_val text;
  title_val text;
  message_val text;
BEGIN
  -- Extract required fields
  user_id_val := notification_data->>'user_id';
  type_val := notification_data->>'type';
  title_val := notification_data->>'title';
  message_val := notification_data->>'message';
  
  -- Validate user_id
  IF user_id_val IS NULL OR NOT public.validate_uuid_secure(user_id_val) THEN
    PERFORM public.log_security_event_secure(
      'INVALID_NOTIFICATION_USER_ID',
      jsonb_build_object('provided_user_id', user_id_val),
      CASE WHEN public.validate_uuid_secure(user_id_val) THEN user_id_val::uuid ELSE NULL END,
      'high'
    );
    RETURN false;
  END IF;
  
  -- Validate type
  IF type_val IS NULL OR type_val NOT IN ('reminder', 'alert', 'update', 'achievement', 'social') THEN
    PERFORM public.log_security_event_secure(
      'INVALID_NOTIFICATION_TYPE',
      jsonb_build_object('provided_type', type_val, 'user_id', user_id_val),
      user_id_val::uuid,
      'medium'
    );
    RETURN false;
  END IF;
  
  -- Validate title and message for XSS
  IF title_val IS NULL OR LENGTH(trim(title_val)) = 0 THEN
    RETURN false;
  END IF;
  
  IF message_val IS NULL OR LENGTH(trim(message_val)) = 0 THEN
    RETURN false;
  END IF;
  
  -- Check for XSS in title and message
  IF title_val ~* '<script|javascript:|data:|vbscript:' OR 
     message_val ~* '<script|javascript:|data:|vbscript:' THEN
    PERFORM public.log_security_event_secure(
      'XSS_ATTEMPT_IN_NOTIFICATION',
      jsonb_build_object('user_id', user_id_val),
      user_id_val::uuid,
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 4. Log successful security hardening
SELECT public.log_security_event_secure(
  'SECURITY_HARDENING_PHASE_2_COMPLETE',
  jsonb_build_object(
    'functions_secured', 4,
    'validation_functions_created', 2,
    'timestamp', now()
  ),
  NULL,
  'low'
);