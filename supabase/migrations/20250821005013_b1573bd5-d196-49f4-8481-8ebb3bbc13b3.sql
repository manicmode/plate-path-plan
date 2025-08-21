-- =============================================
-- SECURE EARNINGS / PAYOUTS / AFFILIATE MIGRATION (idempotent) - FIXED
-- =============================================

-- 0) Columns on influencer (Stripe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='influencer' AND column_name='connect_account_id') THEN
    ALTER TABLE public.influencer ADD COLUMN connect_account_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='influencer' AND column_name='payouts_enabled') THEN
    ALTER TABLE public.influencer ADD COLUMN payouts_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema='public' AND table_name='influencer' AND column_name='default_currency') THEN
    ALTER TABLE public.influencer ADD COLUMN default_currency text DEFAULT 'usd';
  END IF;
END$$;

ALTER TABLE public.influencer
  ALTER COLUMN default_currency SET DEFAULT 'usd';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='influencer_default_currency_ck') THEN
    ALTER TABLE public.influencer
      ADD CONSTRAINT influencer_default_currency_ck CHECK (default_currency ~ '^[a-z]{3}$');
  END IF;
END$$;

-- 1) AFFILIATE CORE (create first to satisfy FKs from challenge_order)
CREATE TABLE IF NOT EXISTS public.affiliate_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL UNIQUE REFERENCES public.influencer(id) ON DELETE CASCADE,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  cookie_duration_days integer NOT NULL DEFAULT 30 CHECK (cookie_duration_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_partner (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_program_id uuid NOT NULL REFERENCES public.affiliate_program(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','terminated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(affiliate_program_id, partner_user_id),
  UNIQUE(affiliate_program_id, referral_code)
);

CREATE TABLE IF NOT EXISTS public.affiliate_click (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_partner_id uuid NOT NULL REFERENCES public.affiliate_partner(id) ON DELETE CASCADE,
  clicked_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  referrer_url text
);

-- 2) challenge_order (now that affiliate_partner exists)
CREATE TABLE IF NOT EXISTS public.challenge_order (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id      uuid NOT NULL REFERENCES public.challenge(id) ON DELETE CASCADE,
  influencer_id     uuid NOT NULL REFERENCES public.influencer(id) ON DELETE CASCADE,
  buyer_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE,
  amount_cents      integer NOT NULL CHECK (amount_cents > 0),
  currency          text NOT NULL DEFAULT 'usd' CHECK (currency ~ '^[a-z]{3}$'),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  affiliate_partner_id uuid NULL REFERENCES public.affiliate_partner(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Keep influencer_id aligned with the challenge owner
CREATE OR REPLACE FUNCTION public.tg_set_challenge_order_influencer()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT c.influencer_id INTO NEW.influencer_id
  FROM public.challenge c
  WHERE c.id = NEW.challenge_id;

  IF NEW.influencer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid challenge_id: %', NEW.challenge_id;
  END IF;

  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_challenge_order_set_influencer') THEN
    CREATE TRIGGER tr_challenge_order_set_influencer
      BEFORE INSERT OR UPDATE OF challenge_id ON public.challenge_order
      FOR EACH ROW EXECUTE FUNCTION public.tg_set_challenge_order_influencer();
  END IF;
END$$;

-- Only one PAID order per buyer per challenge
CREATE UNIQUE INDEX IF NOT EXISTS uq_challenge_order_paid_once
ON public.challenge_order(challenge_id, buyer_user_id)
WHERE status = 'paid';

-- 3) affiliate_conversion (depends on challenge_order)
CREATE TABLE IF NOT EXISTS public.affiliate_conversion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_partner_id uuid NOT NULL REFERENCES public.affiliate_partner(id) ON DELETE CASCADE,
  challenge_order_id uuid NOT NULL UNIQUE REFERENCES public.challenge_order(id) ON DELETE CASCADE,
  commission_amount_cents integer NOT NULL CHECK (commission_amount_cents >= 0),
  converted_at timestamptz DEFAULT now()
);

-- 4) updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at_v2()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_challenge_order_updated_at') THEN
    CREATE TRIGGER tr_challenge_order_updated_at
      BEFORE UPDATE ON public.challenge_order
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at_v2();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_affiliate_program_updated_at') THEN
    CREATE TRIGGER tr_affiliate_program_updated_at
      BEFORE UPDATE ON public.affiliate_program
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at_v2();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='tr_affiliate_partner_updated_at') THEN
    CREATE TRIGGER tr_affiliate_partner_updated_at
      BEFORE UPDATE ON public.affiliate_partner
      FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at_v2();
  END IF;
END$$;

-- 5) RLS enable + clean any old "system_write" policies (FIXED SYNTAX)
ALTER TABLE public.challenge_order      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_program    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_partner    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_click      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversion ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('challenge_order','affiliate_program','affiliate_partner','affiliate_click','affiliate_conversion')
      AND policyname ILIKE '%system_write%'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END$$;

-- challenge_order: buyer read; influencer owner read; explicit service_role write (optional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_order' AND policyname='challenge_order_buyer_read') THEN
    CREATE POLICY challenge_order_buyer_read ON public.challenge_order
      FOR SELECT TO authenticated
      USING (buyer_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_order' AND policyname='challenge_order_influencer_read') THEN
    CREATE POLICY challenge_order_influencer_read ON public.challenge_order
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.influencer i
        WHERE i.id = challenge_order.influencer_id AND i.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='challenge_order' AND policyname='challenge_order_service_write') THEN
    CREATE POLICY challenge_order_service_write ON public.challenge_order
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- affiliate_program: owner manage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_program' AND policyname='affiliate_program_owner_all') THEN
    CREATE POLICY affiliate_program_owner_all ON public.affiliate_program
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.influencer i WHERE i.id = affiliate_program.influencer_id AND i.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.influencer i WHERE i.id = affiliate_program.influencer_id AND i.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_program' AND policyname='affiliate_program_service_write') THEN
    CREATE POLICY affiliate_program_service_write ON public.affiliate_program
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- affiliate_partner: partner read/write own; owner read; service writes allowed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_partner' AND policyname='affiliate_partner_read_scoped') THEN
    CREATE POLICY affiliate_partner_read_scoped ON public.affiliate_partner
      FOR SELECT TO authenticated
      USING (
        partner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.affiliate_program ap
          JOIN public.influencer i ON i.id = ap.influencer_id
          WHERE ap.id = affiliate_partner.affiliate_program_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_partner' AND policyname='affiliate_partner_partner_write') THEN
    CREATE POLICY affiliate_partner_partner_write ON public.affiliate_partner
      FOR ALL TO authenticated
      USING (partner_user_id = auth.uid())
      WITH CHECK (partner_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_partner' AND policyname='affiliate_partner_service_write') THEN
    CREATE POLICY affiliate_partner_service_write ON public.affiliate_partner
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- affiliate_click: owner read; service write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_click' AND policyname='affiliate_click_owner_read') THEN
    CREATE POLICY affiliate_click_owner_read ON public.affiliate_click
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.affiliate_partner ap
          JOIN public.affiliate_program apr ON apr.id = ap.affiliate_program_id
          JOIN public.influencer i ON i.id = apr.influencer_id
          WHERE ap.id = affiliate_click.affiliate_partner_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_click' AND policyname='affiliate_click_service_write') THEN
    CREATE POLICY affiliate_click_service_write ON public.affiliate_click
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- affiliate_conversion: owner read; service write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_conversion' AND policyname='affiliate_conversion_owner_read') THEN
    CREATE POLICY affiliate_conversion_owner_read ON public.affiliate_conversion
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.affiliate_partner ap
          JOIN public.affiliate_program apr ON apr.id = ap.affiliate_program_id
          JOIN public.influencer i ON i.id = apr.influencer_id
          WHERE ap.id = affiliate_conversion.affiliate_partner_id AND i.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='affiliate_conversion' AND policyname='affiliate_conversion_service_write') THEN
    CREATE POLICY affiliate_conversion_service_write ON public.affiliate_conversion
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END$$;

-- 6) GRANTS
REVOKE ALL ON public.challenge_order, public.affiliate_program, public.affiliate_partner, public.affiliate_click, public.affiliate_conversion FROM PUBLIC, anon;
GRANT SELECT ON public.challenge_order, public.affiliate_program, public.affiliate_partner, public.affiliate_click, public.affiliate_conversion TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_partner TO authenticated; -- RLS restricts to own rows
GRANT ALL PRIVILEGES ON public.challenge_order, public.affiliate_program, public.affiliate_partner, public.affiliate_click, public.affiliate_conversion TO service_role;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_challenge_order_influencer_id ON public.challenge_order(influencer_id);
CREATE INDEX IF NOT EXISTS idx_challenge_order_buyer_user_id ON public.challenge_order(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_order_status ON public.challenge_order(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_partner_program_id ON public.affiliate_partner(affiliate_program_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_click_partner_id ON public.affiliate_click(affiliate_partner_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversion_partner_id ON public.affiliate_conversion(affiliate_partner_id);

-- 8) OWNER-SCOPED VIEWS
CREATE OR REPLACE VIEW public.v_influencer_earnings AS
SELECT 
  i.id AS influencer_id,
  COUNT(co.id) AS total_orders,
  COALESCE(SUM(co.amount_cents), 0) AS total_earnings_cents,
  COALESCE(SUM(CASE WHEN co.status='paid' THEN co.amount_cents ELSE 0 END), 0) AS paid_earnings_cents,
  COUNT(CASE WHEN co.status='paid' THEN 1 END) AS paid_orders_count
FROM public.influencer i
LEFT JOIN public.challenge_order co ON co.influencer_id = i.id
WHERE i.user_id = auth.uid()
GROUP BY i.id;

CREATE OR REPLACE VIEW public.v_affiliate_summary AS
SELECT 
  ap.id AS program_id,
  ap.influencer_id,
  COUNT(DISTINCT apr.id) AS partner_count,
  COUNT(ac.id) AS total_clicks,
  COUNT(acv.id) AS total_conversions,
  COALESCE(SUM(acv.commission_amount_cents), 0) AS total_commission_cents
FROM public.affiliate_program ap
JOIN public.influencer i ON i.id = ap.influencer_id
LEFT JOIN public.affiliate_partner apr ON apr.affiliate_program_id = ap.id
LEFT JOIN public.affiliate_click ac ON ac.affiliate_partner_id = apr.id
LEFT JOIN public.affiliate_conversion acv ON acv.affiliate_partner_id = apr.id
WHERE i.user_id = auth.uid()
GROUP BY ap.id, ap.influencer_id;

REVOKE ALL ON public.v_influencer_earnings, public.v_affiliate_summary FROM PUBLIC, anon;
GRANT SELECT ON public.v_influencer_earnings, public.v_affiliate_summary TO authenticated;