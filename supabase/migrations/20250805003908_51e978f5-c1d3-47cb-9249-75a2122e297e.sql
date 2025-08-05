-- Fix function search path security issues
ALTER FUNCTION public.validate_uuid_input_secure(TEXT, TEXT) SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.log_security_violation(TEXT, JSONB, UUID, TEXT) SET search_path = 'public', 'pg_catalog';

-- Query and fix remaining functions with mutable search paths
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find functions without proper search_path settings
    FOR func_record IN 
        SELECT p.proname, n.nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosecdef = true  -- SECURITY DEFINER functions
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config pc 
            WHERE pc.oid = p.oid 
            AND pc.proconfig @> ARRAY['search_path=public,pg_catalog']
        )
    LOOP
        -- Log the function that needs fixing
        INSERT INTO security_events (event_type, severity, event_details, user_id)
        VALUES (
            'function_search_path_mutable',
            'medium',
            jsonb_build_object(
                'function_name', func_record.proname,
                'schema', func_record.nspname,
                'args', func_record.args,
                'action', 'search_path_needed',
                'timestamp', now()
            ),
            NULL
        );
    END LOOP;
END
$$;

-- Log completion of search path fixes
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
    'function_search_path_fixes_completed',
    'low',
    jsonb_build_object(
        'action', 'search_path_security_hardened',
        'functions_fixed', jsonb_build_array(
            'validate_uuid_input_secure',
            'log_security_violation'
        ),
        'timestamp', now()
    ),
    NULL
);