-- Complete fix for habit reminder dispatch with idempotent trigger creation

-- Add the scheduled_date column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'habit_nudges' 
    AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE public.habit_nudges 
    ADD COLUMN scheduled_date date;
  END IF;
END;
$$;

-- Create unique index (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_habit_nudges_user_slug_day
ON public.habit_nudges (user_id, habit_slug, scheduled_date);

-- Add helper index for "already logged today" lookup performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_habit_log_user_day
ON public.habit_log (user_id, ts DESC);

-- Ensure function is in public schema
CREATE OR REPLACE FUNCTION public.set_habit_nudge_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.scheduled_date := NEW.scheduled_for::date;
  RETURN NEW;
END;
$$;

-- Create trigger only if it doesn't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tr_set_habit_nudge_date'
  ) THEN
    CREATE TRIGGER tr_set_habit_nudge_date
      BEFORE INSERT OR UPDATE ON public.habit_nudges
      FOR EACH ROW
      EXECUTE FUNCTION public.set_habit_nudge_date();
  END IF;
END;
$$;

-- Backfill existing records
UPDATE public.habit_nudges 
SET scheduled_date = scheduled_for::date 
WHERE scheduled_date IS NULL;

-- Make column NOT NULL after backfill
ALTER TABLE public.habit_nudges 
ALTER COLUMN scheduled_date SET NOT NULL;

-- Create the corrected dispatch function with proper conflict handling
CREATE OR REPLACE FUNCTION public.rpc_dispatch_habit_reminders_sql()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();        -- treat as app/UTC time for MVP
  v_min_start time := date_trunc('minute', v_now)::time;
  v_min_end   time := (date_trunc('minute', v_now) + interval '5 minutes')::time;
  v_inserted int := 0;
  v_skipped  int := 0;
BEGIN
  WITH due AS (
    SELECT uh.user_id, uh.slug
    FROM public.user_habit uh
    WHERE uh.status = 'active'
      AND uh.reminder_at IS NOT NULL
      -- fire if reminder_at in [now .. now+5min)
      AND (
        (uh.reminder_at >= v_min_start AND uh.reminder_at < v_min_end)
      )
  ),
  not_logged_today AS (
    SELECT d.user_id, d.slug
    FROM due d
    LEFT JOIN public.user_habit uh ON uh.user_id=d.user_id AND uh.slug=d.slug
    LEFT JOIN public.habit_log hl ON hl.habit_id = uh.id
                                  AND hl.ts::date = v_now::date
    WHERE hl.id IS NULL
  ),
  ins AS (
    INSERT INTO public.habit_nudges
      (user_id, habit_slug, scheduled_for, channel, meta)
    SELECT nl.user_id,
           nl.slug,
           v_now,
           'fallback',
           jsonb_build_object('reason','reminder_dispatch',
                              'window_start', v_min_start::text,
                              'window_end',   v_min_end::text)
    FROM not_logged_today nl
    ON CONFLICT (user_id, habit_slug, scheduled_date) DO NOTHING
    RETURNING 1
  )
  SELECT COALESCE((SELECT COUNT(*) FROM ins),0),
         COALESCE((SELECT COUNT(*) FROM due) - COALESCE((SELECT COUNT(*) FROM ins),0),0)
  INTO v_inserted, v_skipped;

  RETURN jsonb_build_object(
    'ok', true,
    'now', v_now,
    'inserted', v_inserted,
    'skipped', v_skipped
  );
END;
$$;

-- Lock down the function
REVOKE ALL ON FUNCTION public.rpc_dispatch_habit_reminders_sql() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dispatch_habit_reminders_sql() TO service_role;