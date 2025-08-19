-- Ensure user_profile table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goals text[] DEFAULT '{}',
  constraints text[] DEFAULT '{}', 
  preferences text[] DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on user_profile
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_profile (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profile' 
    AND policyname = 'up_owner'
  ) THEN
    CREATE POLICY "up_owner" ON public.user_profile
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Create or replace ensure_user_profile function with hardened security
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profile(user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create or replace RPC wrapper with hardened security
CREATE OR REPLACE FUNCTION public.rpc_ensure_user_profile()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.ensure_user_profile();
$$;

-- Safety: make sure we're explicit about who can call what
REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_ensure_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ensure_user_profile() TO authenticated;

-- Add comments to make purpose clear
COMMENT ON FUNCTION public.ensure_user_profile()
IS 'Bootstraps the caller''s profile row if missing. MUST be called as an authenticated user; relies on auth.uid().';

COMMENT ON FUNCTION public.rpc_ensure_user_profile()
IS 'RPC wrapper for ensure_user_profile(); exposed to clients.';

-- Create schema-specific test function for RLS validation
DROP FUNCTION IF EXISTS public.test_user_profile_rls();
CREATE OR REPLACE FUNCTION public.test_user_profile_rls()
RETURNS TABLE(test_name text, result text, details text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  profile_count integer;
BEGIN
  -- Policy presence & shape
  SELECT COUNT(*) INTO profile_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_profile' 
    AND policyname = 'up_owner'
    AND qual = '(user_id = auth.uid())'
    AND with_check = '(user_id = auth.uid())';

  IF profile_count = 1 THEN
    RETURN QUERY SELECT 'RLS Policy Exists', 'PASS', 'up_owner policy correctly configured';
  ELSE
    RETURN QUERY SELECT 'RLS Policy Exists', 'FAIL', 'up_owner policy missing or misconfigured';
  END IF;

  -- Confirm rpc_upsert_user_profile has no user_id param (schema-specific)
  SELECT COUNT(*) INTO profile_count
  FROM information_schema.parameters p
  JOIN information_schema.routines r
    ON p.specific_catalog = r.specific_catalog
   AND p.specific_schema = r.specific_schema
   AND p.specific_name = r.specific_name
  WHERE r.specific_schema = 'public'
    AND r.routine_name = 'rpc_upsert_user_profile'
    AND p.parameter_name = 'user_id';

  IF profile_count = 0 THEN
    RETURN QUERY SELECT 'RPC Security', 'PASS', 'rpc_upsert_user_profile does not accept user_id';
  ELSE
    RETURN QUERY SELECT 'RPC Security', 'FAIL', 'rpc_upsert_user_profile accepts user_id (risk)';
  END IF;

  -- Verify recommend fn exists in public
  SELECT COUNT(*) INTO profile_count
  FROM information_schema.routines
  WHERE specific_schema = 'public'
    AND routine_name = 'rpc_recommend_habits_v2';

  IF profile_count = 1 THEN
    RETURN QUERY SELECT 'Performance Check Ready', 'PASS', 'rpc_recommend_habits_v2 present';
  ELSE
    RETURN QUERY SELECT 'Performance Check Ready', 'FAIL', 'rpc_recommend_habits_v2 missing';
  END IF;

  RETURN;
END;
$func$;

-- Create schema-specific performance test function
DROP FUNCTION IF EXISTS public.test_recommendation_performance();
CREATE OR REPLACE FUNCTION public.test_recommendation_performance()
RETURNS TABLE(test_name text, execution_time text, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  t0 timestamp;
  t1 timestamp;
  dur interval;
  test_profile jsonb;
BEGIN
  test_profile := '{"goals":["sleep","strength"],"constraints":["time-poor"],"preferences":["morning"]}'::jsonb;

  t0 := clock_timestamp();
  PERFORM public.rpc_recommend_habits_v2(test_profile, 3);
  t1 := clock_timestamp();
  dur := t1 - t0;

  IF EXTRACT(milliseconds FROM dur) < 30 THEN
    RETURN QUERY SELECT 'Recommendation Performance',
                         (EXTRACT(milliseconds FROM dur)::text || 'ms'),
                         'PASS';
  ELSE
    RETURN QUERY SELECT 'Recommendation Performance',
                         (EXTRACT(milliseconds FROM dur)::text || 'ms'),
                         'FAIL - Exceeds 30ms budget';
  END IF;
END;
$func$;

-- Narrow test function visibility (no need for wide exposure)
REVOKE ALL ON FUNCTION public.test_user_profile_rls() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.test_recommendation_performance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_user_profile_rls() TO service_role;
GRANT EXECUTE ON FUNCTION public.test_recommendation_performance() TO service_role;

-- Add comments for test functions
COMMENT ON FUNCTION public.test_user_profile_rls()
IS 'Service-only sanity checks for user_profile RLS and RPC signatures.';

COMMENT ON FUNCTION public.test_recommendation_performance()
IS 'Service-only timing check for rpc_recommend_habits_v2.';

-- Create updated_at trigger for user_profile
CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add trigger if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profile_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_user_profile_updated_at_trigger
      BEFORE UPDATE ON public.user_profile
      FOR EACH ROW
      EXECUTE FUNCTION public.update_user_profile_updated_at();
  END IF;
END $$;