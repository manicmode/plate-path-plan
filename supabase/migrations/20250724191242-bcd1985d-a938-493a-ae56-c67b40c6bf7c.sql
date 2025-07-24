-- Fix remaining database functions with search_path vulnerabilities
-- This addresses the Function Search Path Mutable warnings

-- First, let me check what functions still have the issue
-- Based on the linter, there are still 2 functions that need fixing

-- Fix any remaining functions that might have search_path issues
-- Update trigger functions that may not have proper search_path set

-- Create a function to safely update search paths for all functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Get all functions that don't have search_path properly set
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname IN ('update_user_streaks', 'handle_new_user_profile', 'update_follow_counts')
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config pc 
            WHERE pc.oid = p.oid 
            AND pc.parameter = 'search_path'
        )
    LOOP
        -- Update each function to include proper search_path
        CASE func_record.function_name
            WHEN 'update_user_streaks' THEN
                EXECUTE 'ALTER FUNCTION public.update_user_streaks() SET search_path = ''public'', ''pg_catalog''';
            WHEN 'handle_new_user_profile' THEN  
                EXECUTE 'ALTER FUNCTION public.handle_new_user_profile() SET search_path = ''public'', ''pg_catalog''';
            WHEN 'update_follow_counts' THEN
                EXECUTE 'ALTER FUNCTION public.update_follow_counts() SET search_path = ''public'', ''pg_catalog''';
        END CASE;
    END LOOP;
END $$;

-- Move extensions from public schema to extensions schema for better security
-- First create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Note: Moving existing extensions requires manual intervention in Supabase dashboard
-- This is documented as a manual step since ALTER EXTENSION commands may not work
-- Users should move extensions via Supabase dashboard: Database > Extensions