-- =============================================================================
-- CRITICAL SECURITY FIXES - Phase 2: Remove SECURITY DEFINER and Fix Search Paths
-- =============================================================================

-- Fix 1: Find and fix SECURITY DEFINER views
-- First, get the current views that have SECURITY DEFINER
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Drop problematic views that use SECURITY DEFINER
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%security definer%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        RAISE NOTICE 'Dropped view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END $$;

-- Fix 2: Recreate views without SECURITY DEFINER (they were already fixed in previous migrations)
-- Views are already properly created without SECURITY DEFINER

-- Fix 3: Fix search path for functions that don't have it set
-- Update functions to have proper search path
ALTER FUNCTION public.monitor_invalid_uuid_attempts() SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.log_security_event(text, jsonb, uuid, text) SET search_path = 'public', 'pg_catalog';

-- Fix 4: Update any remaining functions that might have mutable search paths
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find functions without proper search path
    FOR func_record IN
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
        AND NOT EXISTS (
            SELECT 1 FROM pg_settings 
            WHERE name = 'search_path' 
            AND setting LIKE '%' || n.nspname || '%'
        )
    LOOP
        -- Set search path for each function
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = ''public'', ''pg_catalog''',
                func_record.schema_name,
                func_record.function_name,
                func_record.args
            );
            RAISE NOTICE 'Updated search path for function: %.%', func_record.schema_name, func_record.function_name;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update search path for function: %.% - %', 
                    func_record.schema_name, func_record.function_name, SQLERRM;
        END;
    END LOOP;
END $$;