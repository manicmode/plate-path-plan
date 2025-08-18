-- Ensure admin read policy exists for audit table
DROP POLICY IF EXISTS audit_read_admins ON public.habit_template_audit;
CREATE POLICY audit_read_admins
  ON public.habit_template_audit
  FOR SELECT
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::jsonb)->>'is_admin','false')::boolean = true
  );