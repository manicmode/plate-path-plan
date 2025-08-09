-- Ensure get_xp_reset_window returns a row
CREATE OR REPLACE FUNCTION public.get_xp_reset_window(p_user_id uuid, p_client_tz text DEFAULT NULL)
RETURNS TABLE(start_utc timestamptz, end_utc timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_catalog'
AS $$
DECLARE
  tz text := 'UTC';
  reset_hour int := 4;
  profile_tz text;
  local_now timestamp; local_start timestamp; local_end timestamp;
BEGIN
  -- Try to read user timezone, ignore if column/table doesn't exist
  BEGIN
    SELECT COALESCE(NULLIF(timezone,''), 'UTC') INTO profile_tz
    FROM public.user_profiles WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    profile_tz := NULL;
  END;
  tz := COALESCE(NULLIF(profile_tz,''), NULLIF(p_client_tz,''), 'UTC');

  -- Try to read daily_reset_hour from config, default to 4 if missing or no active row
  BEGIN
    SELECT daily_reset_hour INTO reset_hour FROM public.xp_config WHERE is_active = true LIMIT 1;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    reset_hour := 4;
  END;
  reset_hour := COALESCE(reset_hour, 4);

  local_now := (now() AT TIME ZONE tz);
  local_start := date_trunc('day', local_now) + make_interval(hours => reset_hour);
  IF local_now < local_start THEN local_start := local_start - interval '1 day'; END IF;
  local_end := local_start + interval '1 day';

  start_utc := (local_start AT TIME ZONE tz);
  end_utc   := (local_end   AT TIME ZONE tz);

  RETURN NEXT;
  RETURN;
END
$$;