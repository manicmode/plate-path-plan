-- Remove the unsafe proposal if it slipped in
DROP FUNCTION IF EXISTS public.authx_is_premium();
DROP FUNCTION IF EXISTS public.authx_is_premium(uuid);

-- 1) Canonical function: keep it in `authx`, lock search_path to pg_catalog
CREATE OR REPLACE FUNCTION authx.is_premium(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  -- Placeholder until premium is implemented; update when you add the flag.
  SELECT false;
$$;

-- Ensure callers have execute but anon/public do not
REVOKE ALL ON FUNCTION authx.is_premium(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION authx.is_premium(uuid) TO authenticated, service_role;

-- 2) Optional: thin wrapper in `public` for legacy callers (schema-qualified call inside)
CREATE OR REPLACE FUNCTION public.is_premium(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT authx.is_premium(uid);
$$;

REVOKE ALL ON FUNCTION public.is_premium(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_premium(uuid) TO authenticated, service_role;