-- PHASE 3: precise fixes for the remaining errors/warnings

-- 1) Habit reminders: explicitly revoke anon & public; owner-only RLS for authenticated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='habit_reminders') THEN
    REVOKE ALL ON TABLE public.habit_reminders FROM PUBLIC, anon;  -- explicit
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

-- 2) Views: make them security *invoker* and security-barrier (no privilege escalation)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_logs_norm') THEN
    ALTER VIEW public.v_habit_logs_norm SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_consistency') THEN
    ALTER VIEW public.v_habit_consistency SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_consistency FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_streaks') THEN
    ALTER VIEW public.v_habit_streaks SET (security_invoker = true, security_barrier = true);
    REVOKE ALL ON TABLE public.v_habit_streaks FROM anon;
  END IF;
END$$;

-- 3) RLS for user-data tables called out by the scanner (only where user_id exists)
DO $block$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname='public'
      AND t.tablename IN (
        'habit_log',
        'user_custom_habit',
        'user_achievement',
        'nudge_event'
      )
  LOOP
    -- only enforce owner policies when a user_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.tablename AND column_name='user_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);

      EXECUTE format($q$
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='%1$s' AND policyname='%1$s_owner_all'
          ) THEN
            EXECUTE 'CREATE POLICY %1$s_owner_all ON public.%1$s
                     FOR ALL TO authenticated
                     USING (user_id = auth.uid())
                     WITH CHECK (user_id = auth.uid())';
          END IF;
        END$$;
      $q$, r.tablename);
    END IF;
  END LOOP;
END
$block$;

-- 4) "Activity/Performance/Friend competition" warnings:
--    lock down common table names if present; owner-only when user_id exists,
--    otherwise just revoke anon to avoid breaking system tables.
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

      EXECUTE format($q$
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='%1$s' AND policyname='%1$s_owner_all'
          ) THEN
            EXECUTE 'CREATE POLICY %1$s_owner_all ON public.%1$s
                     FOR ALL TO authenticated
                     USING (user_id = auth.uid())
                     WITH CHECK (user_id = auth.uid())';
          END IF;
        END$$;
      $q$, t.tablename);
    END IF;
  END LOOP;
END$$;

-- 5) Extensions still in public (one more conservative pass)
DO $$
DECLARE e RECORD;
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;
  FOR e IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname='public'
      AND e.extname NOT IN ('plpgsql','pgcrypto','uuid-ossp')
  LOOP
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', e.extname);
    EXCEPTION WHEN OTHERS THEN
      -- Some cannot be moved; safe to skip.
      NULL;
    END;
  END LOOP;
END$$;