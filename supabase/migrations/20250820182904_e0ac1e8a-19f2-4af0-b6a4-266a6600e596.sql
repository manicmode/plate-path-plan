-- PHASE 3 (fixed): precise security touch-ups

-- 1) Habit reminders: explicit revoke + owner-only RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_reminders') THEN
    REVOKE ALL ON TABLE public.habit_reminders FROM PUBLIC;
    REVOKE ALL ON TABLE public.habit_reminders FROM anon;
    ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_select_own'
    ) THEN
      CREATE POLICY habit_reminders_select_own
        ON public.habit_reminders FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_write_own'
    ) THEN
      CREATE POLICY habit_reminders_write_own
        ON public.habit_reminders FOR INSERT, UPDATE, DELETE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

    CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_slug
      ON public.habit_reminders(user_id, habit_slug);
  END IF;
END$$;

-- 2) Analytics views: run with invoker rights, barrier on, and no direct API access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_logs_norm') THEN
    ALTER VIEW public.v_habit_logs_norm SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM anon;
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_consistency') THEN
    ALTER VIEW public.v_habit_consistency SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_consistency FROM anon;
    REVOKE ALL ON TABLE public.v_habit_consistency FROM authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_streaks') THEN
    ALTER VIEW public.v_habit_streaks SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_streaks FROM anon;
    REVOKE ALL ON TABLE public.v_habit_streaks FROM authenticated;
  END IF;
END$$;

-- 3) Enable RLS on user-data tables (if present) and add owner-only policies once
ALTER TABLE IF EXISTS public.habit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_custom_habit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_achievement  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nudge_event       ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_log')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='habit_log' AND policyname='habit_log_owner_all') THEN
    CREATE POLICY habit_log_owner_all
      ON public.habit_log FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_custom_habit')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_custom_habit' AND policyname='user_custom_habit_owner_all') THEN
    CREATE POLICY user_custom_habit_owner_all
      ON public.user_custom_habit FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='user_achievement')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_achievement' AND policyname='user_achievement_owner_all') THEN
    CREATE POLICY user_achievement_owner_all
      ON public.user_achievement FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='nudge_event')
     AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nudge_event' AND policyname='nudge_event_owner_all') THEN
    CREATE POLICY nudge_event_owner_all
      ON public.nudge_event FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- 4) Activity/Performance/Friend/Leaderboard patterns:
--    revoke anon; if table has user_id then enable RLS and add owner policy.
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname='public'
      AND (
        tablename ILIKE 'user_activity%' OR
        tablename ILIKE '%activity_log%' OR
        tablename ILIKE 'tracking_event%' OR
        tablename ILIKE 'user_performance%' OR
        tablename ILIKE '%performance%data%' OR
        tablename ILIKE 'friend_competition%' OR
        tablename ILIKE '%leaderboard%'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t.tablename);

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t.tablename AND column_name='user_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=t.tablename AND policyname = t.tablename || '_owner_all'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I_owner_all ON public.%I FOR ALL TO authenticated
           USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
          t.tablename, t.tablename
        );
      END IF;
    END IF;
  END LOOP;
END$$;

-- 5) Extensions still in public: try to move (safe to skip on failure)
DO $$
DECLARE e RECORD;
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;
  FOR e IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname='public'
      AND e.extname NOT IN ('plpgsql','pgcrypto','uuid-ossp')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', e.extname);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END$$;