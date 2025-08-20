-- Security Hardening Migration (Final Fix - Grant Core Tables)

-- 1) habit_reminders: keep anon revoked, keep authenticated with GRANT + RLS
REVOKE ALL ON TABLE public.habit_reminders FROM PUBLIC;
REVOKE ALL ON TABLE public.habit_reminders FROM anon;
/* ensure app can still read/write via RLS */
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_reminders TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_owner_read'
  ) THEN
    CREATE POLICY habit_reminders_owner_read ON public.habit_reminders
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='habit_reminders_owner_write'
  ) THEN
    CREATE POLICY habit_reminders_owner_write ON public.habit_reminders
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_habit 
  ON public.habit_reminders (user_id, habit_slug);

-- 2) Analytics views: defensive security_invoker, barrier, revoke direct access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_logs_norm') THEN
    BEGIN
      ALTER VIEW public.v_habit_logs_norm SET (security_invoker = true, security_barrier = true);
    EXCEPTION WHEN OTHERS THEN
      ALTER VIEW public.v_habit_logs_norm SET (security_barrier = true);
    END;
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM anon;
    REVOKE ALL ON TABLE public.v_habit_logs_norm FROM authenticated;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_consistency') THEN
    BEGIN
      ALTER VIEW public.v_habit_consistency SET (security_invoker = true, security_barrier = true);
    EXCEPTION WHEN OTHERS THEN
      ALTER VIEW public.v_habit_consistency SET (security_barrier = true);
    END;
    REVOKE ALL ON TABLE public.v_habit_consistency FROM anon;
    REVOKE ALL ON TABLE public.v_habit_consistency FROM authenticated;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_habit_streaks') THEN
    BEGIN
      ALTER VIEW public.v_habit_streaks SET (security_invoker = true, security_barrier = true);
    EXCEPTION WHEN OTHERS THEN
      ALTER VIEW public.v_habit_streaks SET (security_barrier = true);
    END;
    REVOKE ALL ON TABLE public.v_habit_streaks FROM anon;
    REVOKE ALL ON TABLE public.v_habit_streaks FROM authenticated;
  END IF;
END$$;

-- 3) Core user tables: RLS + owner policies + GRANT (FIXED)
DO $$
DECLARE core_table TEXT;
BEGIN
  FOR core_table IN 
    VALUES ('habit_log'), ('user_custom_habit'), ('user_achievement'), ('nudge_event')
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=core_table) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', core_table);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', core_table);
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname='public' AND tablename=core_table 
          AND policyname = core_table || '_owner_all'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I_owner_all ON public.%I
             FOR ALL TO authenticated
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())',
          core_table, core_table
        );
      END IF;
    END IF;
  END LOOP;
END$$;

-- 4) Activity/Performance/Friend/Leaderboard patterns (fixed + GRANT)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename::text AS tbl
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
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.tbl);

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name  = r.tbl
        AND c.column_name = 'user_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tbl);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tbl);

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename = r.tbl
          AND policyname = r.tbl || '_owner_all'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I_owner_all ON public.%I
             FOR ALL TO authenticated
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())',
          r.tbl, r.tbl
        );
      END IF;
    END IF;
  END LOOP;
END$$;