-- ===========================
-- Admin: Coupons & Notifications (HARDENED)
-- ===========================

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.coupon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  percent_off integer NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  audience text NOT NULL DEFAULT 'all',          -- 'all' | 'users' | 'creators' | 'custom'
  user_id uuid REFERENCES auth.users(id),        -- nullable for broadcasts
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- 2) RLS
ALTER TABLE public.coupon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Clean old policies (idempotent)
DO $$DECLARE r record; BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname='public' AND tablename IN ('coupon','notifications')
  LOOP EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename); END LOOP;
END$$;

-- Coupons: service_role only (UI must go through Edge)
CREATE POLICY coupon_service_all
ON public.coupon FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Notifications:
-- Read: authenticated users can see their own rows OR global broadcasts to their audience
CREATE POLICY notifications_user_read
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND audience IN ('all','users','creators'))
);

-- Write: service_role only (admin tools / functions)
CREATE POLICY notifications_service_write
ON public.notifications FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 3) Privileges (defense in depth)
REVOKE ALL ON public.coupon, public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;          -- SELECT only; writes via Edge
GRANT ALL ON public.coupon, public.notifications TO service_role;

-- 4) Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_code_lower ON public.coupon (lower(code));
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON public.notifications(audience);