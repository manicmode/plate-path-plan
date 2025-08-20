
-- ============================================
-- 1) Block materialized views from API
--    (MatViews have no RLS; make them backend-only)
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON MATERIALIZED VIEW %I.%I FROM anon', r.schemaname, r.matviewname);
    EXECUTE format('REVOKE ALL ON MATERIALIZED VIEW %I.%I FROM PUBLIC', r.schemaname, r.matviewname);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON MATERIALIZED VIEW %I.%I FROM authenticated', r.schemaname, r.matviewname);
    -- Default: no client SELECT on MatViews (access via RPC or guarded view)
    EXECUTE format('REVOKE SELECT ON MATERIALIZED VIEW %I.%I FROM authenticated', r.schemaname, r.matviewname);
    -- Backend/service role retains full control:
    EXECUTE format('GRANT ALL PRIVILEGES ON MATERIALIZED VIEW %I.%I TO service_role', r.schemaname, r.matviewname);
  END LOOP;
END$$;

-- ============================================
-- 2) Lock down catalog/config/content tables
--    (templates, badges/achievements, meditation content)
--    Auth = read-only; writes via service_role
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname='public'
      AND (
        tablename ILIKE 'habit_template%' OR
        tablename ILIKE 'badge%' OR
        tablename ILIKE '%achievement%' OR
        tablename ILIKE 'meditation%' OR
        tablename ILIKE 'content_%'
      )
  LOOP
    -- remove risky grants
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon', r.schemaname, r.tablename);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON TABLE %I.%I FROM authenticated', r.schemaname, r.tablename);
    -- allow read if the app needs it
    EXECUTE format('GRANT SELECT ON TABLE %I.%I TO authenticated', r.schemaname, r.tablename);
    -- backend retains full control
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I.%I TO service_role', r.schemaname, r.tablename);
  END LOOP;
END$$;

-- ============================================
-- 3) Enforce owner RLS on health/activity logs
--    (if user_id column exists)
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT t.schemaname, t.tablename
    FROM pg_tables t
    WHERE t.schemaname='public'
      AND (
        t.tablename ILIKE '%mood%' OR
        t.tablename ILIKE '%exercise%' OR
        t.tablename ILIKE '%nutrition%' OR
        t.tablename ILIKE 'health_%' OR
        t.tablename ILIKE '%_logs' OR
        t.tablename ILIKE 'biometric%'
      )
  LOOP
    -- skip if no user_id
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema=t.schemaname
        AND c.table_name = t.tablename
        AND c.column_name='user_id'
    ) THEN
      -- enable RLS
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);

      -- create an owner policy if missing
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname=r.schemaname AND tablename=r.tablename
          AND policyname = r.tablename || '_owner_all'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I_owner_all ON %I.%I
             FOR ALL TO authenticated
             USING (user_id = auth.uid())
             WITH CHECK (user_id = auth.uid())',
          r.tablename, r.schemaname, r.tablename
        );
      END IF;

      -- grants: app can CRUD its own rows (RLS enforces ownership)
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I.%I TO authenticated', r.schemaname, r.tablename);
      -- no anon
      EXECUTE format('REVOKE ALL ON %I.%I FROM anon', r.schemaname, r.tablename);
    END IF;
  END LOOP;
END$$;
