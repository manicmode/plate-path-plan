-- XP Config + Helpers Migration
-- Create xp_config table if not exists
CREATE TABLE IF NOT EXISTS public.xp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  daily_soft_cap integer NOT NULL DEFAULT 60,
  daily_post_cap_multiplier numeric NOT NULL DEFAULT 0.25,
  action_meal_log integer NOT NULL DEFAULT 6,
  action_hydration_log integer NOT NULL DEFAULT 3,
  action_recovery_log integer NOT NULL DEFAULT 10,
  action_workout_logged integer NOT NULL DEFAULT 20,
  curve_base integer NOT NULL DEFAULT 60,
  curve_exp numeric NOT NULL DEFAULT 1.55,
  curve_min_next integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and allow public SELECT
ALTER TABLE public.xp_config ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'xp_config' AND policyname = 'Anyone can view xp_config'
  ) THEN
    CREATE POLICY "Anyone can view xp_config" ON public.xp_config FOR SELECT USING (true);
  END IF;
END $$;

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_xp_config_updated_at'
  ) THEN
    CREATE TRIGGER update_xp_config_updated_at
    BEFORE UPDATE ON public.xp_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed a default config row only if table is empty
INSERT INTO public.xp_config (
  is_active, daily_soft_cap, daily_post_cap_multiplier,
  action_meal_log, action_hydration_log, action_recovery_log, action_workout_logged,
  curve_base, curve_exp, curve_min_next
)
SELECT
  false, 60, 0.25,
  6, 3, 10, 20,
  60, 1.55, 50
WHERE NOT EXISTS (SELECT 1 FROM public.xp_config);

-- Helper: get_xp_reset_window
CREATE OR REPLACE FUNCTION public.get_xp_reset_window(p_user_id uuid, p_tz text DEFAULT NULL)
RETURNS TABLE(window_start timestamptz, window_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  tz text := COALESCE(p_tz, 'UTC');
BEGIN
  -- If a timezone is provided, compute midnight window for that tz; else use UTC day
  IF p_tz IS NOT NULL THEN
    window_start := (date_trunc('day', now() AT TIME ZONE tz) AT TIME ZONE tz);
  ELSE
    window_start := date_trunc('day', now());
  END IF;
  window_end := window_start + INTERVAL '1 day';
  RETURN NEXT;
END;
$$;

-- Helper: apply_daily_cap
CREATE OR REPLACE FUNCTION public.apply_daily_cap(p_user_id uuid, p_proposed_xp integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  cfg RECORD;
  today_start timestamptz;
  today_end timestamptz;
  awarded_today integer := 0;
  cap integer := 60;
  post_mult numeric := 0.25;
  allowed integer := p_proposed_xp;
BEGIN
  -- Load active config; if none active, do not cap
  SELECT * INTO cfg
  FROM public.xp_config
  WHERE is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN p_proposed_xp;
  END IF;

  cap := COALESCE(cfg.daily_soft_cap, cap);
  post_mult := COALESCE(cfg.daily_post_cap_multiplier, post_mult);

  SELECT window_start, window_end
  INTO today_start, today_end
  FROM public.get_xp_reset_window(p_user_id, NULL);

  SELECT COALESCE(SUM(total_xp), 0)::int
  INTO awarded_today
  FROM public.workout_xp_logs
  WHERE user_id = p_user_id
    AND created_at >= today_start
    AND created_at < today_end;

  IF awarded_today >= cap THEN
    allowed := FLOOR(p_proposed_xp * post_mult);
  ELSIF awarded_today + p_proposed_xp <= cap THEN
    allowed := p_proposed_xp;
  ELSE
    allowed := (cap - awarded_today) + FLOOR((awarded_today + p_proposed_xp - cap) * post_mult);
  END IF;

  RETURN GREATEST(allowed, 0);
END;
$$;