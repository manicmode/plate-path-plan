-- FINAL SECURITY CLEANUP - CATCH REMAINING FUNCTIONS

-- Fix functions that have proconfig but lack search_path specifically
DO $$
DECLARE r record; func_signature text;
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
        RAISE NOTICE 'Fixed search_path for function: %.%(%)', r.nspname, r.proname, func_signature;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Skipping %.%: %', r.nspname, r.proname, SQLERRM;
      END;
    END IF;
  END LOOP;
END$$;