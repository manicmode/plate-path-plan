-- SAFER SECURITY TOUCH-UP (idempotent, no schema rewrites, no view drops)

-- A) Harden key analytics views (no drops)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_logs_norm') THEN
    ALTER VIEW public.v_habit_logs_norm SET (security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM anon, authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_consistency') THEN
    ALTER VIEW public.v_habit_consistency SET (security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_consistency FROM anon, authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_streaks') THEN
    ALTER VIEW public.v_habit_streaks SET (security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_streaks FROM anon, authenticated;
  END IF;
END$$;

-- B) Pin search_path on all public functions (safe across the board)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;

-- C) Ensure RLS + owner policies on user-scoped tables we actually use
DO $$
BEGIN
  -- habit_reminders
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_reminders') THEN
    ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_read_own'
    ) THEN
      CREATE POLICY habit_reminders_read_own ON public.habit_reminders
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_write_own'
    ) THEN
      CREATE POLICY habit_reminders_write_own ON public.habit_reminders
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
    CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_slug ON public.habit_reminders(user_id, habit_slug);
  END IF;

  -- habit_log
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_log') THEN
    ALTER TABLE public.habit_log ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_log' AND policyname='habit_log_owner_access'
    ) THEN
      CREATE POLICY habit_log_owner_access ON public.habit_log
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;

  -- user_custom_habit (already created earlier, ensure locked)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_custom_habit') THEN
    ALTER TABLE public.user_custom_habit ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_custom_habit' AND policyname='uch_read_own'
    ) THEN
      CREATE POLICY uch_read_own ON public.user_custom_habit
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_custom_habit' AND policyname='uch_write_own'
    ) THEN
      CREATE POLICY uch_write_own ON public.user_custom_habit
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;

  -- user_achievement
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_achievement') THEN
    ALTER TABLE public.user_achievement ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_achievement' AND policyname='ua_read_own'
    ) THEN
      CREATE POLICY ua_read_own ON public.user_achievement
      FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_achievement' AND policyname='ua_write_own'
    ) THEN
      CREATE POLICY ua_write_own ON public.user_achievement
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;

  -- nudge_event
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='nudge_event') THEN
    ALTER TABLE public.nudge_event ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nudge_event' AND policyname='nudge_event_owner_access'
    ) THEN
      CREATE POLICY nudge_event_owner_access ON public.nudge_event
      FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
    END IF;
  END IF;
END$$;

-- D) Lock down materialized views (no API reads)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname='public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.matviewname);
  END LOOP;
END$$;

-- E) Hide any obvious backup/snapshot tables (no API reads)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname='public'
      AND (tablename ILIKE '%backup%' OR tablename ILIKE '%_bkp%' OR tablename ILIKE 'bkp_%')
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon, authenticated', r.schemaname, r.tablename);
  END LOOP;
END$$;

-- F) Move extensions out of public (conservative allowlist)
DO $$
DECLARE r RECORD;
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;
  FOR r IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname='public'
      AND e.extname NOT IN ('plpgsql','pgcrypto','uuid-ossp')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', r.extname);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END$$;