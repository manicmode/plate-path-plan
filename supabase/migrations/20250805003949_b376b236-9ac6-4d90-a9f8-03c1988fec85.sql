-- Fix search path issues with correct approach
-- First set search path for the two new functions
ALTER FUNCTION public.validate_uuid_input_secure(TEXT, TEXT) SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.log_security_violation(TEXT, JSONB, UUID, TEXT) SET search_path = 'public', 'pg_catalog';

-- Log successful search path fixes
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
    'search_path_security_hardened',
    'low',
    jsonb_build_object(
        'action', 'function_search_paths_secured',
        'functions_fixed', jsonb_build_array(
            'validate_uuid_input_secure',
            'log_security_violation'
        ),
        'security_level', 'enhanced',
        'timestamp', now()
    ),
    NULL
);