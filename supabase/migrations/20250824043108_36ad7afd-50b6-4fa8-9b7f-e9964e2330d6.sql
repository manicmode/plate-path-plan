-- Security hardening patch with extension safety tweaks

-- 1) Put extensions in a dedicated schema (not public)
CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE ext record;
BEGIN
  FOR ext IN
    SELECT e.extname
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext.extname);
  END LOOP;
END $$;

-- Make extension functions resolvable without qualification
GRANT USAGE ON SCHEMA extensions TO public;

-- 2) Lock down the public schema (keep USAGE; remove CREATE)
REVOKE CREATE ON SCHEMA public FROM public;
GRANT USAGE ON SCHEMA public TO public;

-- 3) Standardize default search_path: built-ins first, extensions, then app objects
-- Include 'extensions' in the default search_path (db + common roles)
ALTER DATABASE postgres SET search_path = pg_catalog, extensions, public;

DO $$
BEGIN
  -- Tweak these role names to match your project (Supabase example roles shown)
  BEGIN EXECUTE 'ALTER ROLE authenticated SET search_path = pg_catalog, extensions, public'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER ROLE anon          SET search_path = pg_catalog, extensions, public'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER ROLE service_role  SET search_path = pg_catalog, extensions, public'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;