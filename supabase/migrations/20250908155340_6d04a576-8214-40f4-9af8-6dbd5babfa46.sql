-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Feature flags (global)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- reads: any authenticated user
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON public.feature_flags;
CREATE POLICY "authenticated can read feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- writes: service key only (bypasses RLS) OR explicit guard:
DROP POLICY IF EXISTS "Service role can write feature flags" ON public.feature_flags;
CREATE POLICY "service role can write flags"
ON public.feature_flags
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger (assumes function exists)
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- seed
INSERT INTO public.feature_flags(key,value) VALUES
('FEATURE_ENRICH_HEALTHSCAN','{"enabled":false,"sample_pct":0,"timeout_ms":1200}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- User-scoped overrides
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flag_key)
);
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own feature flags" ON public.user_feature_flags;
CREATE POLICY "user can read own flags"
ON public.user_feature_flags
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can write own feature flags" ON public.user_feature_flags;
CREATE POLICY "user can write own flags"
ON public.user_feature_flags
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_user_feature_flags_updated_at
BEFORE UPDATE ON public.user_feature_flags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- (optional) speed index for user flags only (PK on feature_flags.key already creates index)
CREATE INDEX IF NOT EXISTS idx_user_feature_flags_user ON public.user_feature_flags(user_id);