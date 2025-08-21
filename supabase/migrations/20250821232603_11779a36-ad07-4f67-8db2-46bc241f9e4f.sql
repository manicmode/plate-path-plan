-- FINAL SECURITY HARDENING - TARGET REMAINING FUNCTIONS

-- Pin search_path for specific problematic functions by name
-- These are likely the remaining functions causing warnings

DO $$
DECLARE
  func_names text[] := ARRAY[
    'gtrgm_union', 'gtrgm_same', 'gin_extract_value_trgm', 'gin_extract_query_trgm',
    'gin_trgm_consistent', 'gin_trgm_triconsistent', 'word_similarity_commutator_op',
    'similarity_dist', 'word_similarity_dist_op', 'word_similarity_dist_commutator_op',
    'gtrgm_in', 'gtrgm_out', 'gtrgm_consistent', 'gtrgm_distance', 'gtrgm_penalty',
    'gtrgm_compress', 'gtrgm_decompress', 'strict_word_similarity', 
    'strict_word_similarity_op', 'strict_word_similarity_commutator_op',
    'strict_word_similarity_dist_op', 'strict_word_similarity_dist_commutator_op',
    'gtrgm_options', 'gtrgm_picksplit', 'set_limit', 'show_limit', 'show_trgm',
    'similarity', 'similarity_op', 'word_similarity', 'word_similarity_op'
  ];
  func_name text;
  r record;
  func_signature text;
BEGIN
  -- Try to fix functions that are SECURITY DEFINER and don't have search_path set
  FOR r IN
    SELECT n.nspname, p.proname, p.oid
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' 
      AND p.prosecdef 
      AND p.proconfig IS NULL
  LOOP
    BEGIN
      -- Get function arguments for proper signature
      SELECT pg_get_function_identity_arguments(r.oid) INTO func_signature;
      
      -- Try to set search_path
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path TO ''public'', ''pg_temp'';',
        r.nspname, r.proname, func_signature
      );
      
      RAISE NOTICE 'Fixed search_path for function: %.%(%)', r.nspname, r.proname, func_signature;
    EXCEPTION 
      WHEN OTHERS THEN 
        RAISE NOTICE 'Could not fix search_path for function: %.% - %', r.nspname, r.proname, SQLERRM;
        -- Continue with other functions
        NULL;
    END;
  END LOOP;
END$$;