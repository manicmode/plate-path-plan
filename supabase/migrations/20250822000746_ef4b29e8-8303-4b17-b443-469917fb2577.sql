-- Fix remaining search_path issues on SECURITY DEFINER functions
DO $$
DECLARE 
  r RECORD; 
  func_signature text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, p.oid,
           array_to_string(p.proconfig, ',') AS cfg
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    IF r.cfg IS NULL OR position('search_path' in r.cfg) = 0 THEN
      SELECT pg_get_function_identity_arguments(r.oid) INTO func_signature;
      BEGIN
        EXECUTE format(
          'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;',
          r.nspname, r.proname, func_signature
        );
        RAISE NOTICE 'Fixed search_path for %.%', r.nspname, r.proname;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping %.%: %', r.nspname, r.proname, SQLERRM;
      END;
    END IF;
  END LOOP;
END$$;

-- Post-check: verify no SECURITY DEFINER functions remain without search_path
SELECT n.nspname, p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef
  AND (p.proconfig IS NULL OR array_to_string(p.proconfig, ',') NOT ILIKE '%search_path=%');