-- A) Migration — XP config table + RLS + “one active” guard + timestamp trigger
-- xp_config holds tunables; we won’t change any existing schemas
CREATE TABLE IF NOT EXISTS public.xp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  curve_base integer NOT NULL DEFAULT 60,
  curve_exp numeric NOT NULL DEFAULT 1.55,
  curve_min_next integer NOT NULL DEFAULT 50,
  daily_soft_cap integer NOT NULL DEFAULT 60,
  daily_post_cap_multiplier numeric NOT NULL DEFAULT 0.25,
  daily_reset_hour integer NOT NULL DEFAULT 4,
  action_meal_log integer NOT NULL DEFAULT 3,
  action_hydration_log integer NOT NULL DEFAULT 1,
  action_recovery_log integer NOT NULL DEFAULT 4,
  action_workout_logged integer NOT NULL DEFAULT 12,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='xp_config' AND policyname='Anyone can read xp_config'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can read xp_config" ON public.xp_config FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='xp_config' AND policyname='Admins manage xp_config'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins manage xp_config" ON public.xp_config FOR ALL
             USING (has_role(auth.uid(),''admin'')) WITH CHECK (has_role(auth.uid(),''admin''))';
  END IF;
END$$;

-- Only one active config at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_active_xp_config
ON public.xp_config(is_active) WHERE is_active = true;

-- updated_at touch trigger (create if missing)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_xp_config_touch ON public.xp_config;
CREATE TRIGGER trg_xp_config_touch
BEFORE UPDATE ON public.xp_config
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed one inactive row if table is empty
INSERT INTO public.xp_config(is_active) SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.xp_config);

-- B) Helpers — curve + window + safe cap applier (no impact unless called)
-- XP needed to go from level n -> n+1
CREATE OR REPLACE FUNCTION public.xp_required_for_level(level_in integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  b integer := 60; e numeric := 1.55; m integer := 50;
  cfg RECORD; n integer := GREATEST(COALESCE(level_in,1),1);
BEGIN
  SELECT curve_base, curve_exp, curve_min_next INTO cfg
  FROM public.xp_config WHERE is_active = true LIMIT 1;
  IF FOUND THEN b := cfg.curve_base; e := cfg.curve_exp; m := cfg.curve_min_next; END IF;
  RETURN GREATEST(ROUND(b * POWER(n, e))::int, m);
END $$;

-- Cumulative XP to reach level n
CREATE OR REPLACE FUNCTION public.xp_cumulative_for_level(level_in integer)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE sum_xp int := 0; i int;
BEGIN
  IF COALESCE(level_in,1) <= 1 THEN RETURN 0; END IF;
  FOR i IN 1..(level_in-1) LOOP sum_xp := sum_xp + public.xp_required_for_level(i); END LOOP;
  RETURN sum_xp;
END $$;

-- 4am local reset window for a user (with configurable hour)
CREATE OR REPLACE FUNCTION public.get_xp_reset_window(p_user_id uuid, p_client_tz text DEFAULT NULL)
RETURNS TABLE(start_utc timestamptz, end_utc timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
  tz text := 'UTC'; reset_hour int := 4; cfg RECORD;
  local_now timestamp; local_start timestamp; local_end timestamp;
  profile_tz text;
BEGIN
  SELECT COALESCE(NULLIF(timezone,''), 'UTC') INTO profile_tz
  FROM public.user_profiles WHERE user_id = p_user_id;
  tz := COALESCE(NULLIF(profile_tz,''), NULLIF(p_client_tz,''), 'UTC');

  SELECT daily_reset_hour INTO reset_hour FROM public.xp_config WHERE is_active = true LIMIT 1;
  reset_hour := COALESCE(reset_hour, 4);

  local_now := (now() AT TIME ZONE tz);
  local_start := date_trunc('day', local_now) + make_interval(hours => reset_hour);
  IF local_now < local_start THEN local_start := local_start - interval '1 day'; END IF;
  local_end := local_start + interval '1 day';

  start_utc := (local_start AT TIME ZONE tz);
  end_utc   := (local_end   AT TIME ZONE tz);
  RETURN;
END $$;

-- Utility: apply soft cap with post-cap multiplier; never returns < 1
CREATE OR REPLACE FUNCTION public.apply_daily_cap(p_user_id uuid, p_total_award int, p_client_tz text DEFAULT NULL)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  cap int := 60; mult numeric := 0.25;
  w RECORD; today_awarded int := 0; allowed int; remainder int; final int;
BEGIN
  SELECT daily_soft_cap, daily_post_cap_multiplier INTO cap, mult
  FROM public.xp_config WHERE is_active = true LIMIT 1;

  SELECT * INTO w FROM public.get_xp_reset_window(p_user_id, p_client_tz);
  SELECT COALESCE(SUM(total_xp),0)::int INTO today_awarded
  FROM public.workout_xp_logs
  WHERE user_id = p_user_id AND created_at >= w.start_utc AND created_at < w.end_utc;

  IF today_awarded >= cap THEN
    final := CEIL(GREATEST(p_total_award,0) * mult)::int;
  ELSE
    allowed := GREATEST(cap - today_awarded, 0);
    remainder := GREATEST(p_total_award - allowed, 0);
    final := allowed + CEIL(remainder * mult)::int;
  END IF;

  RETURN GREATEST(final, 1);
END $$;

-- Helpful index for the window sum
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_created
ON public.workout_xp_logs(user_id, created_at DESC);

-- C) Set slow-leveling values (inactive row)
UPDATE public.xp_config
SET daily_soft_cap = 60,
    daily_post_cap_multiplier = 0.25,
    action_meal_log = 3,
    action_hydration_log = 1,
    action_recovery_log = 4,
    action_workout_logged = 12
WHERE is_active = false;
