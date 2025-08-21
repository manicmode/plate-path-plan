-- ===========================
-- Influencer listing (hardened)
-- ===========================

-- Columns (idempotent)
ALTER TABLE public.influencer 
  ADD COLUMN IF NOT EXISTS headline            text,
  ADD COLUMN IF NOT EXISTS avatar_url          text,
  ADD COLUMN IF NOT EXISTS category_tags       text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS location_city       text,
  ADD COLUMN IF NOT EXISTS location_country    text,
  ADD COLUMN IF NOT EXISTS social_links        jsonb  DEFAULT '{}'::jsonb, -- {instagram, youtube, tiktok, twitter, website}
  ADD COLUMN IF NOT EXISTS is_listed           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS listed_at           timestamptz;

-- Handle hygiene + index (case-insensitive uniqueness)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'influencer_handle_ck'
  ) THEN
    ALTER TABLE public.influencer
      ADD CONSTRAINT influencer_handle_ck CHECK (handle ~ '^[a-z0-9_]{3,24}$');
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_influencer_handle_lower
  ON public.influencer (lower(handle));

CREATE INDEX IF NOT EXISTS idx_influencer_listed
  ON public.influencer (is_listed) WHERE is_listed = true;

-- RLS: owners can manage their row; public can read ONLY listed rows
ALTER TABLE public.influencer ENABLE ROW LEVEL SECURITY;

-- Clean old conflicting policies (idempotent)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='influencer'
  LOOP EXECUTE format('DROP POLICY %I ON public.influencer', r.policyname); END LOOP;
END$$;

-- Owner full access from the private dashboard
CREATE POLICY influencer_owner_all ON public.influencer
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Public read of ONLY listed creators (powers the Hub)
CREATE POLICY influencer_public_read ON public.influencer
FOR SELECT TO anon, authenticated
USING (is_listed = true);

-- Privileges (safe with RLS)
GRANT SELECT ON public.influencer TO anon, authenticated;

-- Public cards view (no user_id; read-only fields only)
CREATE OR REPLACE VIEW public.v_influencer_public_cards AS
SELECT
  id,
  handle,
  display_name,
  avatar_url,
  headline,
  bio,
  category_tags,
  location_city,
  location_country,
  social_links,
  verified,
  listed_at
FROM public.influencer
WHERE is_listed = true;

GRANT SELECT ON public.v_influencer_public_cards TO anon, authenticated;