-- HARDENING TWEAKS FOR AFFILIATE SYSTEM

-- 1) Case-insensitive referral codes per program
CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_referral_code_ci
  ON public.affiliate_partner(affiliate_program_id, lower(referral_code));

-- 2) Restrict partner self-signups to active programs only
DROP POLICY IF EXISTS affiliate_partner_partner_write ON public.affiliate_partner;

CREATE POLICY affiliate_partner_partner_write ON public.affiliate_partner
  FOR INSERT TO authenticated
  WITH CHECK (
    partner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.affiliate_program ap
      WHERE ap.id = affiliate_program_id AND ap.is_active
    )
  );

-- Keep UPDATE/DELETE self permissions
CREATE POLICY affiliate_partner_partner_write_ud ON public.affiliate_partner
  FOR UPDATE TO authenticated
  USING (partner_user_id = auth.uid())
  WITH CHECK (partner_user_id = auth.uid());

CREATE POLICY affiliate_partner_partner_delete ON public.affiliate_partner
  FOR DELETE TO authenticated
  USING (partner_user_id = auth.uid());