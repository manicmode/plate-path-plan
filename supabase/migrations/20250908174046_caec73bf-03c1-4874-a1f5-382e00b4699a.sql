-- 0) Trigger helper (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- 1) Ensure columns exist on feature_flags
ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS value   jsonb    NOT NULL DEFAULT '{}'::jsonb;

-- 2) Ensure columns exist on user_feature_flags
ALTER TABLE public.user_feature_flags
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS value   jsonb    NOT NULL DEFAULT '{}'::jsonb;

-- 3) Migrate existing boolean -> jsonb only where empty
UPDATE public.feature_flags
SET value = jsonb_build_object('enabled', enabled)
WHERE value = '{}'::jsonb;

UPDATE public.user_feature_flags
SET value = jsonb_build_object('enabled', enabled)
WHERE value = '{}'::jsonb;

-- 4) Seed HEALTHSCAN flag (no-op if exists)
INSERT INTO public.feature_flags(key, enabled, value)
VALUES ('FEATURE_ENRICH_HEALTHSCAN', false, '{"enabled":false,"sample_pct":0,"timeout_ms":1200}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5) RPCs (JSONB + boolean wrapper), SECURITY DEFINER, stable
CREATE OR REPLACE FUNCTION public.is_feature_enabled_jsonb(feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resolved jsonb;
BEGIN
  SELECT COALESCE(uff.value, ff.value) INTO resolved
  FROM public.feature_flags ff
  LEFT JOIN public.user_feature_flags uff
    ON uff.flag_key = ff.key AND uff.user_id = auth.uid()
  WHERE ff.key = feature_key;

  RETURN COALESCE(resolved, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_feature_enabled(feature_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v jsonb;
BEGIN
  v := public.is_feature_enabled_jsonb(feature_key);
  RETURN COALESCE((v->>'enabled')::boolean, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_feature_flag_jsonb(flag_key_param text, value_param jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = flag_key_param) THEN
    RAISE EXCEPTION 'Invalid feature flag: %', flag_key_param;
  END IF;

  INSERT INTO public.user_feature_flags (user_id, flag_key, enabled, value)
  VALUES (auth.uid(), flag_key_param,
          COALESCE((value_param->>'enabled')::boolean, false),
          value_param)
  ON CONFLICT (user_id, flag_key) DO UPDATE
    SET enabled    = COALESCE((EXCLUDED.value->>'enabled')::boolean, false),
        value      = EXCLUDED.value,
        updated_at = now();

  RETURN true;
END;
$$;

-- 6) RLS policies (if not present already)
-- feature_flags: read for authenticated; writes via service key (bypasses RLS) or service_role
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated can read feature flags" ON public.feature_flags;
CREATE POLICY "authenticated can read feature flags"
ON public.feature_flags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service role can write flags" ON public.feature_flags;
CREATE POLICY "service role can write flags"
ON public.feature_flags FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- user_feature_flags: per-user RLS
ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user can read own flags" ON public.user_feature_flags;
CREATE POLICY "user can read own flags"
ON public.user_feature_flags FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user can write own flags" ON public.user_feature_flags;
CREATE POLICY "user can write own flags"
ON public.user_feature_flags FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 7) Allow app roles to call the RPCs
GRANT EXECUTE ON FUNCTION public.is_feature_enabled_jsonb(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text)       TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_user_feature_flag_jsonb(text, jsonb) TO authenticated;