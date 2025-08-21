-- Tables (as proposed)
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  default_value BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flag_name)
);

-- Integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_feature_flags_flag_fk'
  ) THEN
    ALTER TABLE public.user_feature_flags
      ADD CONSTRAINT user_feature_flags_flag_fk
      FOREIGN KEY (flag_name) REFERENCES public.feature_flags(flag_name)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Optimized index for JOIN pattern (flag_name, user_id)
CREATE INDEX IF NOT EXISTS idx_user_flags_flag_user
  ON public.user_feature_flags(flag_name, user_id);

-- RLS
ALTER TABLE public.feature_flags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_readable_by_all ON public.feature_flags;
CREATE POLICY feature_flags_readable_by_all
  ON public.feature_flags FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_feature_flags_own_only ON public.user_feature_flags;
CREATE POLICY user_feature_flags_own_only
  ON public.user_feature_flags FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Priviliges (defense-in-depth)
REVOKE ALL ON public.feature_flags, public.user_feature_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.feature_flags TO anon, authenticated;         -- read flags anywhere
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feature_flags TO authenticated;  -- owner-only via RLS

-- Seed flags
INSERT INTO public.feature_flags (flag_name, default_value, description) VALUES
  ('voice_coach_mvp',    false, 'Enable Voice Coach MVP for specific users'),
  ('voice_coach_disabled', false, 'Global kill switch for Voice Coach')
ON CONFLICT (flag_name) DO NOTHING;

-- Auto-maintain updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_feature_flags_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_feature_flags_set_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE PROCEDURE public.tg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_user_feature_flags_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_feature_flags_set_updated_at
    BEFORE UPDATE ON public.user_feature_flags
    FOR EACH ROW EXECUTE PROCEDURE public.tg_set_updated_at();
  END IF;
END$$;

-- Function: global kill switch is global (no user override) with security hardening
CREATE OR REPLACE FUNCTION public.is_feature_enabled(flag_name_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $func$
DECLARE
  user_flag_enabled BOOLEAN;
  global_kill BOOLEAN;
BEGIN
  -- Global OFF wins
  SELECT ff.default_value INTO global_kill
  FROM public.feature_flags ff
  WHERE ff.flag_name = 'voice_coach_disabled';

  IF COALESCE(global_kill, false) THEN
    RETURN false;
  END IF;

  -- User override (for authenticated) or global default
  SELECT COALESCE(uff.enabled, ff.default_value) INTO user_flag_enabled
  FROM public.feature_flags ff
  LEFT JOIN public.user_feature_flags uff
    ON uff.flag_name = ff.flag_name AND uff.user_id = auth.uid()
  WHERE ff.flag_name = flag_name_param;

  RETURN COALESCE(user_flag_enabled, false);
END;
$func$;

-- Tighten function privileges
REVOKE ALL ON FUNCTION public.is_feature_enabled(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT) TO authenticated, service_role;