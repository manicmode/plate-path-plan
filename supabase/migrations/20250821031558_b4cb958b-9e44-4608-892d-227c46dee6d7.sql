-- ================================
-- ADMIN AUDIT + METRICS (HARDENED)
-- ================================

-- 1) Admin audit log (with FK + indexes)
CREATE TABLE IF NOT EXISTS public.admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_id text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;

-- Clean conflicting policies if they exist (idempotent)
DO $$DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='admin_audit'
  LOOP EXECUTE format('DROP POLICY %I ON public.admin_audit', r.policyname); END LOOP;
END$$;

-- Only admins can READ audit rows (uses public.user_roles)
CREATE POLICY admin_audit_read_admins
ON public.admin_audit
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
));

-- Optional: explicit service_role write (service_role bypasses RLS, but this is self-documenting)
CREATE POLICY admin_audit_service_write
ON public.admin_audit
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Tighten privileges
REVOKE ALL ON public.admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_audit TO authenticated;     -- read only; gated by policy above
GRANT ALL ON public.admin_audit TO service_role;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit(action);

-- 2) Metrics view (admin-only: service_role only; read via Edge)
CREATE OR REPLACE VIEW public.v_platform_metrics AS
SELECT
  now() AS as_of,
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM auth.users u WHERE u.created_at >= now() - interval '30 days') AS new_users_30d,
  COALESCE((SELECT COUNT(*) FROM public.challenge_order WHERE status = 'paid'), 0) AS paid_orders_all,
  COALESCE((SELECT SUM(amount_cents) FROM public.challenge_order WHERE status = 'paid'), 0) AS gmv_cents,
  -- NOTE: net_revenue_cents is platform-take. Keep in Edge with configurable rate; 10% here is a placeholder.
  COALESCE((SELECT SUM(amount_cents) * 0.10 FROM public.challenge_order WHERE status = 'paid'), 0)::bigint AS net_revenue_cents,
  COALESCE((SELECT COUNT(*) FROM public.challenge_order WHERE status = 'refunded'), 0) AS refunds_count;

-- Lock it down (no direct client reads)
REVOKE ALL ON public.v_platform_metrics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_platform_metrics TO service_role;