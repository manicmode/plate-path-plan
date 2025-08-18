-- SECURITY HARDENING FOR HABIT TEMPLATES
-- - View read-only (select-only for clients)
-- - Enable RLS on base table, block direct writes
-- - Explicit read policy
-- - Secure wrapper RPC with role check + safe search_path
-- - Minimize PUBLIC/schema defaults that trigger linters

-- 1) Make the view SELECT-only (leave base table hidden to clients)
REVOKE INSERT, UPDATE, DELETE ON public.habit_templates FROM anon, authenticated;
GRANT  SELECT                 ON public.habit_templates TO   anon, authenticated;

-- 2) Tighten schema-level defaults (common linter gripe)
REVOKE ALL    ON SCHEMA public FROM PUBLIC;
GRANT  USAGE  ON SCHEMA public TO   anon, authenticated;

-- 3) Base table: enable RLS, allow reads via policy, block direct writes
ALTER TABLE public.habit_template ENABLE ROW LEVEL SECURITY;

-- Ensure clients can't mutate the base table directly
REVOKE INSERT, UPDATE, DELETE ON public.habit_template FROM anon, authenticated;

-- Optionally hide base-table reads so clients must use the view (recommended)
REVOKE SELECT ON public.habit_template FROM anon, authenticated;

-- Read policy (only needed if you keep base-table SELECTs; safe to leave)
DROP POLICY IF EXISTS habit_template_read ON public.habit_template;
CREATE POLICY habit_template_read
  ON public.habit_template
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4) Secure wrapper around your existing RPC
-- NOTE: This assumes you already have: public.rpc_upsert_habit_templates(jsonb)
CREATE OR REPLACE FUNCTION public.secure_upsert_habit_templates(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Require an authenticated or service role JWT
  IF coalesce((current_setting('request.jwt.claims', true)::jsonb ->> 'role'),'')
       NOT IN ('authenticated','service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Delegate to the existing function (keeps all your validations/triggers)
  PERFORM public.rpc_upsert_habit_templates(payload);
END;
$$;

-- Only expose the wrapper; keep the original internal
REVOKE ALL     ON FUNCTION public.rpc_upsert_habit_templates(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.secure_upsert_habit_templates(jsonb)
  TO authenticated;

-- 5) Safer default privileges going forward (prevents future drift)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES    FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT  SELECT ON TABLES TO   anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;