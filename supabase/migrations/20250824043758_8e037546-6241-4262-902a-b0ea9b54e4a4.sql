-- Optional polish improvements (idempotent)

-- Alter the *current* DB, not hardcoded 'postgres'
DO $$
BEGIN
  EXECUTE format(
    'ALTER DATABASE %I SET search_path = pg_catalog, extensions, public',
    current_database()
  );
END $$;

-- Prevent object creation in 'extensions' too (leave USAGE so functions resolve)
REVOKE CREATE ON SCHEMA extensions FROM PUBLIC;

-- Include a couple extra common roles if they exist
DO $$
BEGIN
  BEGIN EXECUTE 'ALTER ROLE postgres        SET search_path = pg_catalog, extensions, public'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'ALTER ROLE dashboard_user  SET search_path = pg_catalog, extensions, public'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;