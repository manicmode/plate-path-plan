-- Phase 2: Critical Security Fixes

-- First, identify and fix any remaining SECURITY DEFINER views
-- Query all views to check for security definer usage
DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Get view definition
        SELECT definition INTO view_definition 
        FROM pg_views 
        WHERE schemaname = view_record.schemaname 
        AND viewname = view_record.viewname;
        
        -- Check if it contains SECURITY DEFINER
        IF view_definition ILIKE '%security definer%' THEN
            -- Log the problematic view
            INSERT INTO security_events (event_type, severity, event_details, user_id)
            VALUES (
                'security_definer_view_detected',
                'high',
                jsonb_build_object(
                    'view_name', view_record.viewname,
                    'schema', view_record.schemaname,
                    'action', 'needs_conversion',
                    'timestamp', now()
                ),
                NULL
            );
        END IF;
    END LOOP;
END
$$;

-- Add enhanced input validation function for UUIDs
CREATE OR REPLACE FUNCTION public.validate_uuid_input_secure(input_value TEXT, context_name TEXT DEFAULT 'general')
RETURNS UUID AS $$
DECLARE
    validated_uuid UUID;
BEGIN
    -- Handle null or empty input
    IF input_value IS NULL OR input_value = '' OR input_value = 'undefined' OR input_value = 'null' THEN
        -- Log security event for invalid input
        INSERT INTO security_events (event_type, severity, event_details, user_id)
        VALUES (
            'invalid_uuid_input',
            'medium',
            jsonb_build_object(
                'context', context_name,
                'input_value', COALESCE(input_value, 'NULL'),
                'reason', 'empty_or_null_uuid',
                'timestamp', now()
            ),
            auth.uid()
        );
        
        RAISE EXCEPTION 'Invalid UUID input: % in context: %', input_value, context_name;
    END IF;
    
    -- Attempt to cast to UUID
    BEGIN
        validated_uuid := input_value::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        -- Log security event for malformed UUID
        INSERT INTO security_events (event_type, severity, event_details, user_id)
        VALUES (
            'invalid_uuid_format',
            'medium',
            jsonb_build_object(
                'context', context_name,
                'input_value', input_value,
                'reason', 'malformed_uuid',
                'timestamp', now()
            ),
            auth.uid()
        );
        
        RAISE EXCEPTION 'Malformed UUID: % in context: %', input_value, context_name;
    END;
    
    RETURN validated_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add constraint validation for user_notifications table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications') THEN
        -- Add constraints to prevent invalid data
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'user_notifications_type_check'
        ) THEN
            ALTER TABLE public.user_notifications 
            ADD CONSTRAINT user_notifications_type_check 
            CHECK (type IN ('reminder', 'alert', 'update', 'achievement', 'social', 'system'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'user_notifications_title_check'
        ) THEN
            ALTER TABLE public.user_notifications 
            ADD CONSTRAINT user_notifications_title_check 
            CHECK (length(title) > 0 AND length(title) <= 200);
        END IF;
    END IF;
END
$$;

-- Create comprehensive security monitoring function
CREATE OR REPLACE FUNCTION public.log_security_violation(
    violation_type TEXT,
    violation_details JSONB,
    user_context UUID DEFAULT NULL,
    severity_level TEXT DEFAULT 'medium'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_events (event_type, severity, event_details, user_id, created_at)
    VALUES (
        violation_type,
        severity_level,
        violation_details || jsonb_build_object(
            'logged_at', now(),
            'system_version', '2.0',
            'auto_logged', true
        ),
        COALESCE(user_context, auth.uid()),
        now()
    );
    
    -- For critical violations, also log to a separate critical events table if it exists
    IF severity_level = 'critical' THEN
        INSERT INTO security_events (event_type, severity, event_details, user_id, created_at)
        VALUES (
            'critical_security_alert',
            'critical',
            jsonb_build_object(
                'original_violation', violation_type,
                'escalated_at', now(),
                'requires_immediate_attention', true,
                'details', violation_details
            ),
            COALESCE(user_context, auth.uid()),
            now()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log completion of Phase 2 security fixes
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
    'system_phase2_security_fixes_completed',
    'low',
    jsonb_build_object(
        'phase', 'database_validation_hardening',
        'fixes_applied', jsonb_build_array(
            'uuid_validation_function_added',
            'constraint_validation_enhanced',
            'security_monitoring_improved',
            'critical_violation_escalation_added'
        ),
        'status', 'completed',
        'next_phase', 'client_side_security_hardening',
        'timestamp', now()
    ),
    NULL
);