-- Security hardening migration to address Lovable security review findings
-- Locks down public access, enables RLS, hardens functions, removes direct API exposure

-- 0) Harden direct view access used by RPCs (e.g., v_habit_logs_norm)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_logs_norm') THEN
    -- safer predicate handling
    ALTER VIEW public.v_habit_logs_norm SET (security_barrier = true);
    -- do not allow direct API reads; RPCs will read it with auth.uid() filters
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM anon;
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_consistency') THEN
    ALTER VIEW public.v_habit_consistency SET (security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_consistency FROM anon;
    REVOKE ALL ON TABLE public.v_habit_consistency FROM authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_streaks') THEN
    ALTER VIEW public.v_habit_streaks SET (security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_streaks FROM anon;
    REVOKE ALL ON TABLE public.v_habit_streaks FROM authenticated;
  END IF;
END$$;

-- 1) Ensure RLS + policies on habit_reminders (own-row only)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_reminders') THEN
    ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_read_own'
    ) THEN
      CREATE POLICY habit_reminders_read_own
        ON public.habit_reminders
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_write_own'
    ) THEN
      CREATE POLICY habit_reminders_write_own
        ON public.habit_reminders
        FOR ALL
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

    CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_slug
      ON public.habit_reminders (user_id, habit_slug);
  END IF;
END$$;

-- 2) Lock down any *backup* tables—no API access; if they have user_id, protect with RLS
DO $main$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname='public'
      AND (tablename ILIKE '%backup%' OR tablename ILIKE '%_bkp%' OR tablename ILIKE 'bkp_%')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.tablename);

    -- if table appears to have per-user rows, enforce own-row RLS as a safety net
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema=r.schemaname AND table_name=r.tablename AND column_name='user_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);

      -- create idempotent policies
      EXECUTE format($q$
        DO $d$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname='%1$s' AND tablename='%2$s' AND policyname='%2$s_read_own'
          ) THEN
            EXECUTE 'CREATE POLICY %2$s_read_own ON %1$I.%2$I FOR SELECT TO authenticated USING (user_id = auth.uid())';
          END IF;
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname='%1$s' AND tablename='%2$s' AND policyname='%2$s_write_own'
          ) THEN
            EXECUTE 'CREATE POLICY %2$s_write_own ON %1$I.%2$I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
          END IF;
        END
        $d$;
      $q$, r.schemaname, r.tablename);
    END IF;
  END LOOP;
END
$main$;

-- 3) Materialized views should not be directly readable by API roles
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.matviewname);
  END LOOP;
END$$;

-- 4) Function search_path hardening (pin to public)
DO $$
BEGIN
  -- Some may not exist in every env; ignore missing.
  BEGIN
    ALTER FUNCTION public.rpc_get_my_habits_with_stats() SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.rpc_delete_user_habit(text, boolean) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.rpc_delete_all_paused_user_habits(boolean) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.rpc_create_custom_habit(
      text, habit_domain, text, text, text, integer, boolean, text, time, integer[]
    ) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.rpc_get_habit_history(text, int) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.rpc_get_domain_activity(int) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  -- Add search_path to other existing functions
  BEGIN
    ALTER FUNCTION public.log_security_event(jsonb) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.ensure_user_profile() SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;

  BEGIN
    ALTER FUNCTION public.validate_security_event(jsonb) SET search_path = public;
  EXCEPTION WHEN undefined_function THEN NULL; END;
END$$;

-- 5) Move any extensions out of "public" (some security scanners flag this)
DO $$
DECLARE r RECORD;
BEGIN
  -- Create extensions schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  FOR r IN
    SELECT extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname='public'
      AND extname NOT IN ('plpgsql') -- Don't move core extensions
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', r.extname);
    EXCEPTION WHEN OTHERS THEN
      -- Some extensions cannot be moved; skip silently.
      NULL;
    END;
  END LOOP;
END$$;

-- 6) "System activity" & "achievements" tables (if present): restrict to owner/service
DO $$
BEGIN
  -- Activity/telemetry type table
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='system_activity') THEN
    ALTER TABLE public.system_activity ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.system_activity FROM anon, authenticated;
    -- if the app ever needs it, expose via RPC only (service role).
  END IF;

  -- User achievements
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_achievement') THEN
    ALTER TABLE public.user_achievement ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='user_achievement' AND policyname='ua_read_own'
    ) THEN
      CREATE POLICY ua_read_own
        ON public.user_achievement
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='user_achievement' AND policyname='ua_write_own'
    ) THEN
      CREATE POLICY ua_write_own
        ON public.user_achievement
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;

  -- Handle user_habit_badges if it exists and needs protection
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_habit_badges') THEN
    ALTER TABLE public.user_habit_badges ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='user_habit_badges' AND policyname='uhb_read_own'
    ) THEN
      CREATE POLICY uhb_read_own
        ON public.user_habit_badges
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='user_habit_badges' AND policyname='uhb_write_own'
    ) THEN
      CREATE POLICY uhb_write_own
        ON public.user_habit_badges
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END$$;