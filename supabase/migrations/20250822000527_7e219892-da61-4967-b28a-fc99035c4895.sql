-- SECURITY SWEEP (idempotent)
-- 1) Safety helpers ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- Allow anon read ONLY for explicitly whitelisted, non-PII tables:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='feature_flags') THEN
    -- no-op if feature_flags doesn't exist in this schema
    NULL;
  END IF;
END$$;

-- 2) Discover risky public tables (PII / Health / Finance) -------------------
-- 2a. Any table that has obvious PII/health/finance columns OR names
WITH candidates AS (
  SELECT c.oid, n.nspname AS schema, c.relname AS tbl
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r'
),
by_cols AS (
  SELECT DISTINCT c.oid
  FROM candidates c
  JOIN information_schema.columns col
    ON col.table_schema=c.schema AND col.table_name=c.tbl
  WHERE col.column_name ~* '(email|name|phone|address|city|postal|zip|dob|birth|token|ip|user_agent
                             |weight|sleep|meal|food|calorie|hydration|exercise|workout|steps
                             |payment|payout|card|charge|revenue|gmv|price|order|checkout)'
),
by_name AS (
  SELECT oid FROM candidates
  WHERE tbl ~* '(user|profile|event|activity|log|fitness|health|payment|payout|revenue|gmv|metric|analytics)'
),
risky AS (
  SELECT DISTINCT c.schema, c.tbl, c.oid
  FROM candidates c
  WHERE c.oid IN (SELECT oid FROM by_cols UNION SELECT oid FROM by_name)
)
SELECT * FROM risky;  -- (visible in migration logs for auditing)

-- 3) Enforce RLS & tighten grants on risky tables ----------------------------
DO $$
DECLARE
  r RECORD;
  has_uid boolean;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND (
        c.oid IN (
          SELECT DISTINCT c2.oid
          FROM pg_class c2
          JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
          WHERE n2.nspname='public' AND c2.relkind='r'
        )
        AND (
          c.relname ~* '(user|profile|event|activity|log|fitness|health|payment|payout|revenue|gmv|metric|analytics)'
          OR EXISTS (
            SELECT 1 FROM information_schema.columns col
            WHERE col.table_schema='public' AND col.table_name=c.relname
              AND col.column_name ~* '(email|name|phone|address|city|postal|zip|dob|birth|token|ip|user_agent
                                       |weight|sleep|meal|food|calorie|hydration|exercise|workout|steps
                                       |payment|payout|card|charge|revenue|gmv|price|order|checkout)'
          )
        )
      )
  LOOP
    -- Skip safe public table(s) explicitly whitelisted
    IF r.tbl IN ('feature_flags') THEN
      CONTINUE;
    END IF;

    -- Enable + force RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;',  r.tbl);

    -- Remove anon access, restrict API to authenticated only (filtered by RLS)
    EXECUTE format('REVOKE ALL ON public.%I FROM anon;', r.tbl);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated;', r.tbl);

    -- If table has user_id -> owner-only policies; otherwise admin-only
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=r.tbl AND column_name='user_id'
    ) INTO has_uid;

    IF has_uid THEN
      -- SELECT
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_select') THEN
        EXECUTE format($q$
          CREATE POLICY owner_select ON public.%I
          FOR SELECT TO authenticated
          USING (user_id = auth.uid());
        $q$, r.tbl);
      END IF;
      -- INSERT
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_insert') THEN
        EXECUTE format($q$
          CREATE POLICY owner_insert ON public.%I
          FOR INSERT TO authenticated
          WITH CHECK (user_id = auth.uid());
        $q$, r.tbl);
      END IF;
      -- UPDATE
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_update') THEN
        EXECUTE format($q$
          CREATE POLICY owner_update ON public.%I
          FOR UPDATE TO authenticated
          USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());
        $q$, r.tbl);
      END IF;
      -- DELETE
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_delete') THEN
        EXECUTE format($q$
          CREATE POLICY owner_delete ON public.%I
          FOR DELETE TO authenticated
          USING (user_id = auth.uid());
        $q$, r.tbl);
      END IF;
    ELSE
      -- No user_id column: default to admin-only visibility
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='admin_only_select') THEN
        EXECUTE format($q$
          CREATE POLICY admin_only_select ON public.%I
          FOR SELECT TO authenticated
          USING (public.is_admin());
        $q$, r.tbl);
      END IF;
      -- lock writes to admins too
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='admin_only_write') THEN
        EXECUTE format($q$
          CREATE POLICY admin_only_write ON public.%I
          FOR ALL TO authenticated
          USING (public.is_admin())
          WITH CHECK (public.is_admin());
        $q$, r.tbl);
      END IF;
    END IF;
  END LOOP;
END$$;

-- 4) Views: run as invoker so RLS/grants apply
DO $$
DECLARE v RECORD;
BEGIN
  FOR v IN SELECT table_schema, table_name FROM information_schema.views WHERE table_schema='public'
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', v.table_schema, v.table_name);
  END LOOP;
END$$;

-- 5) Finance/metrics tables: ensure admin-only (belt & suspenders)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND c.relname ~* '(payment|payout|revenue|gmv|metric|analytics)'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;',  r.tbl);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='admin_only_select') THEN
      EXECUTE format($q$
        CREATE POLICY admin_only_select ON public.%I
        FOR SELECT TO authenticated
        USING (public.is_admin());
      $q$, r.tbl);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.tbl AND policyname='admin_only_write') THEN
      EXECUTE format($q$
        CREATE POLICY admin_only_write ON public.%I
        FOR ALL TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
      $q$, r.tbl);
    END IF;
  END LOOP;
END$$;

-- 6) "Function search_path mutable" warning: pin on all SECURITY DEFINER funcs
DO $$
DECLARE r RECORD; sig text;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, p.oid, p.proconfig
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
  LOOP
    SELECT pg_get_function_identity_arguments(r.oid) INTO sig;
    IF r.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(r.proconfig) cfg WHERE cfg LIKE 'search_path=%'
    ) THEN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp;', r.nspname, r.proname, sig);
    END IF;
  END LOOP;
END$$;

-- 7) Optional: remove any blanket anon GRANTs across public (skip whitelist)
DO $$
DECLARE g RECORD;
BEGIN
  FOR g IN
    SELECT table_name
    FROM information_schema.role_table_grants
    WHERE table_schema='public' AND grantee='anon'
  LOOP
    IF g.table_name NOT IN ('feature_flags') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon;', g.table_name);
    END IF;
  END LOOP;
END$$;