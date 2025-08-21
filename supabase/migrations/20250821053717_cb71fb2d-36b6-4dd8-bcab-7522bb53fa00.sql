-- 1) Lock base table
REVOKE ALL ON public.influencer FROM anon;

-- Keep owner policy for creators
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='influencer' AND policyname='influencer_owner_all'
  ) THEN
    CREATE POLICY influencer_owner_all ON public.influencer
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END$$;

-- 2) Recreate SAFE public view (no user_id, no private joins)
DROP VIEW IF EXISTS public.v_influencer_public_cards;
CREATE VIEW public.v_influencer_public_cards AS
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