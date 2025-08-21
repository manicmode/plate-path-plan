-- Work with existing feature_flags table (uses 'key' column)
-- Create user_feature_flags table
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flag_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, flag_key)
);

-- Seed flags first (needed before FK constraint)
INSERT INTO public.feature_flags (key, enabled, updated_at) VALUES
  ('voice_coach_mvp',    false, now()),
  ('voice_coach_disabled', false, now())
ON CONFLICT (key) DO NOTHING;

-- Ensure feature_flags.key is UNIQUE so FK can reference it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conrelid = 'public.feature_flags'::regclass
      AND c.contype = 'u'
      AND EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY (c.conkey)
          AND a.attname = 'key'
      )
  ) THEN
    ALTER TABLE public.feature_flags
      ADD CONSTRAINT feature_flags_key_unique UNIQUE (key);
  END IF;
END$$;

-- Add FK constraint after tables and seed data exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_feature_flags_flag_fk'
  ) THEN
    ALTER TABLE public.user_feature_flags
      ADD CONSTRAINT user_feature_flags_flag_fk
      FOREIGN KEY (flag_key) REFERENCES public.feature_flags(key)
      ON DELETE CASCADE;
  END IF;
END$$;

-- Optimized index for JOIN pattern (flag_key, user_id)  
CREATE INDEX IF NOT EXISTS idx_user_flags_flag_user
  ON public.user_feature_flags(flag_key, user_id);

-- RLS
ALTER TABLE public.feature_flags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_readable_by_all ON public.feature_flags;
CREATE POLICY feature_flags_readable_by_all
  ON public.feature_flags FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS user_feature_flags_own_only ON public.user_feature_flags;
CREATE POLICY user_feature_flags_own_only
  ON public.user_feature_flags FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Privileges (defense-in-depth)
REVOKE ALL ON public.feature_flags, public.user_feature_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_feature_flags TO authenticated;

-- Guarantee the timestamp trigger function exists
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
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_feature_flags_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_feature_flags_set_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE PROCEDURE public.tg_set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_feature_flags_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_feature_flags_set_updated_at
    BEFORE UPDATE ON public.user_feature_flags
    FOR EACH ROW EXECUTE PROCEDURE public.tg_set_updated_at();
  END IF;
END$$;

-- Function with security hardening (updated to use 'key' column)
CREATE OR REPLACE FUNCTION public.is_feature_enabled(flag_key_param TEXT)
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
  SELECT ff.enabled INTO global_kill
  FROM public.feature_flags ff
  WHERE ff.key = 'voice_coach_disabled';

  IF COALESCE(global_kill, false) THEN
    RETURN false;
  END IF;

  -- User override (for authenticated) or global default
  SELECT COALESCE(uff.enabled, ff.enabled) INTO user_flag_enabled
  FROM public.feature_flags ff
  LEFT JOIN public.user_feature_flags uff
    ON uff.flag_key = ff.key AND uff.user_id = auth.uid()
  WHERE ff.key = flag_key_param;

  RETURN COALESCE(user_flag_enabled, false);
END;
$func$;

-- Function privileges
REVOKE ALL ON FUNCTION public.is_feature_enabled(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT) TO authenticated, service_role;