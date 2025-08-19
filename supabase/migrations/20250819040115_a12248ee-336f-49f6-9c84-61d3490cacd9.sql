-- Fix the SQL-only habit reminder dispatch function
-- Apply critical fixes for conflict handling and explicit date insertion

-- First, let's make scheduled_date NOT NULL since we're populating it
ALTER TABLE public.habit_nudges
  ALTER COLUMN scheduled_date SET NOT NULL;

-- Add helper index for "already logged today" lookup performance
CREATE INDEX IF NOT EXISTS idx_habit_log_user_day
ON public.habit_log (user_id, ts DESC);

-- Recreate the dispatch function with the fixes
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
      (user_id, habit_slug, scheduled_for, scheduled_date, channel, meta)
    SELECT nl.user_id,
           nl.slug,
           v_now,
           (v_now::date),                      -- set explicitly
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