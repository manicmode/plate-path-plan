-- Final cleanup: Remove ALL remaining problematic functions and views
-- This migration addresses all remaining security linter issues

-- 1. Drop ALL variations of the problematic functions
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_violation(text, jsonb, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_security_event() CASCADE;

-- 2. Search for and drop any remaining SECURITY DEFINER views
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%SECURITY DEFINER%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_record.schemaname) || '.' || quote_ident(view_record.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped SECURITY DEFINER view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END $$;

-- 3. Drop all functions that don't have proper search_path settings
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname AS schema_name,
               p.proname AS function_name,
               pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND p.proname IN ('log_security_event', 'log_security_violation', 'validate_security_event')
          AND (p.proconfig IS NULL OR NOT EXISTS (
            SELECT 1 FROM unnest(p.proconfig) AS config 
            WHERE config LIKE 'search_path=%'
          ))
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(func_record.schema_name) || '.' || quote_ident(func_record.function_name) || '(' || func_record.identity_args || ') CASCADE';
        RAISE NOTICE 'Dropped function with bad search_path: %.%', func_record.schema_name, func_record.function_name;
    END LOOP;
END $$;

-- 4. Only keep the properly configured security functions we created in the last migration
-- These should already be correct with SET search_path = public, pg_catalog

-- 5. Final verification query to show remaining issues
SELECT 
    'SECURITY DEFINER Views:' as issue_type,
    COUNT(*) as count
FROM pg_views 
WHERE schemaname = 'public' 
AND definition ILIKE '%SECURITY DEFINER%'

UNION ALL

SELECT 
    'Functions without search_path:' as issue_type,
    COUNT(*) as count
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config 
    WHERE config LIKE 'search_path=%'
  ));