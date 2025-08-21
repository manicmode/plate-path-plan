-- COMPREHENSIVE SECURITY HARDENING PACK - CORRECTED VERSION
-- This addresses Security Definer Views, exposed user data, and other security warnings

-- 1) Fix "Security Definer View" - make all public views security_invoker
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
  LOOP
    EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true);', r.table_schema, r.table_name);
  END LOOP;
END$$;

-- 2) Lock down user-owned data (owner-only RLS)
-- For any table in public that has a user_id column
DO $$
DECLARE
  r record;
  pol_exists boolean;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN information_schema.columns col
      ON col.table_schema = n.nspname AND col.table_name = c.relname AND col.column_name='user_id'
    WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    -- Enable & force RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tbl);

    -- Grants: no anon on PII tables; allow authenticated (RLS will filter)
    EXECUTE format('REVOKE ALL ON public.%I FROM anon;', r.tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', r.tbl);

    -- Owner-only READ - check if policy exists first
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_select'
    ) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format($q$
        CREATE POLICY owner_select ON public.%I
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
      $q$, r.tbl);
    END IF;

    -- Owner-only WRITE policies
    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_write'
    ) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format($q$
        CREATE POLICY owner_write ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
      $q$, r.tbl);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_update'
    ) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format($q$
        CREATE POLICY owner_update ON public.%I
        FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
      $q$, r.tbl);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tbl AND policyname='owner_delete'
    ) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format($q$
        CREATE POLICY owner_delete ON public.%I
        FOR DELETE TO authenticated
        USING (user_id = auth.uid());
      $q$, r.tbl);
    END IF;
  END LOOP;
END$$;

-- 3) Lock down business metrics (admin-only)
-- Apply to tables whose names look like metrics
DO $$
DECLARE
  r record;
  pol_exists boolean;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
      AND (c.relname ~* '(^|_)revenue|(^|_)gmv|(^|_)payout|(^|_)metric|(^|_)analytics|(^|_)business')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tbl);

    -- No anon; authenticated allowed but RLS gates to admins only
    EXECUTE format('REVOKE ALL ON public.%I FROM anon;', r.tbl);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated;', r.tbl);

    SELECT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=r.tbl AND policyname='admin_only_select'
    ) INTO pol_exists;
    IF NOT pol_exists THEN
      EXECUTE format($q$
        CREATE POLICY admin_only_select ON public.%I
        FOR SELECT TO authenticated
        USING (public.is_admin());
      $q$, r.tbl);
    END IF;
  END LOOP;
END$$;

-- 4) Remove permissive arena_events policy and replace with owner-only
-- This addresses the "Health & Wellness data exposed" issue
DROP POLICY IF EXISTS "p_arena_events_select" ON public.arena_events;

-- Create owner-only policy for arena_events
DO $$
DECLARE
  pol_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='arena_events' AND policyname='arena_events_owner_select'
  ) INTO pol_exists;
  
  IF NOT pol_exists THEN
    CREATE POLICY arena_events_owner_select ON public.arena_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;
END$$;