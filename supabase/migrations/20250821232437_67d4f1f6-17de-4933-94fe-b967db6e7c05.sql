-- COMPLETE REMAINING SECURITY HARDENING - TARGETED APPROACH

-- 1) Remove matviews from API access (CORRECTED SYNTAX)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname='public'
  LOOP
    -- Correct syntax: don't use "MATERIALIZED VIEW" keyword in REVOKE
    EXECUTE format('REVOKE ALL ON %I.%I FROM anon, authenticated;', r.schemaname, r.matviewname);
  END LOOP;
END$$;

-- 2) Pin search_path for ALL SECURITY DEFINER functions that don't have it
DO $$
DECLARE
  r record;
  func_signature text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, p.oid
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.prosecdef 
      AND p.proconfig IS NULL
  LOOP
    -- Get the function signature for proper identification
    SELECT pg_get_function_identity_arguments(r.oid) INTO func_signature;
    
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO ''public'', ''pg_temp'';',
      r.nspname, r.proname, func_signature
    );
  END LOOP;
END$$;

-- 3) Try to move extensions that support schema changes (skip ones that don't)
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE 
  r record;
  ext_name text;
BEGIN
  -- List of extensions that typically support schema changes
  FOR ext_name IN 
    SELECT unnest(ARRAY['uuid-ossp', 'pgcrypto', 'btree_gin', 'btree_gist', 'citext', 'hstore', 'ltree', 'unaccent']) 
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_extension e 
      JOIN pg_namespace n ON n.oid = e.extnamespace 
      WHERE e.extname = ext_name AND n.nspname = 'public'
    ) THEN
      BEGIN
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions;', ext_name);
      EXCEPTION 
        WHEN OTHERS THEN 
          -- Skip extensions that don't support schema changes
          NULL;
      END;
    END IF;
  END LOOP;
END$$;