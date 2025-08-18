
-- Tighten audit table access and make admin-only reads effective

-- 1) Enable RLS on the audit table
ALTER TABLE public.habit_template_audit ENABLE ROW LEVEL SECURITY;

-- 2) Reset overly broad grants and set precise ones
REVOKE ALL ON TABLE public.habit_template_audit FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON TABLE public.habit_template_audit TO authenticated;     -- allow policy evaluation
GRANT  SELECT, INSERT ON TABLE public.habit_template_audit TO service_role;

-- 3) Admin-only read policy (recreate to be safe)
DROP POLICY IF EXISTS audit_read_admins ON public.habit_template_audit;
CREATE POLICY audit_read_admins
  ON public.habit_template_audit
  FOR SELECT
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'is_admin','false')::boolean = true
  );

-- 4) Allow inserts from service_role (triggers) while RLS is ON
DROP POLICY IF EXISTS audit_insert_service ON public.habit_template_audit;
CREATE POLICY audit_insert_service
  ON public.habit_template_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 5) Ensure the audit trigger function can log regardless of caller’s RLS
ALTER FUNCTION public.log_habit_template_changes() OWNER TO postgres;
ALTER FUNCTION public.log_habit_template_changes() SECURITY DEFINER;
COMMENT ON FUNCTION public.log_habit_template_changes() IS
  'Audit trigger runs as owner to ensure logging even with RLS enabled.';

-- Optional quick checks to run manually after apply:
-- SELECT public.secure_upsert_habit_templates('[]'::jsonb);  -- should be forbidden unless service_role or is_admin:true
-- SELECT action, slug, changed_role, changed_at FROM public.habit_template_audit ORDER BY changed_at DESC LIMIT 5;
