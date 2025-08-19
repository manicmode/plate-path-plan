-- Add uniqueness constraint using a composite approach instead of date expression
-- We'll add a date column to make this easier
ALTER TABLE public.habit_nudges 
ADD COLUMN IF NOT EXISTS scheduled_date date GENERATED ALWAYS AS (scheduled_for::date) STORED;

-- Create unique index on the stored column
CREATE UNIQUE INDEX IF NOT EXISTS uq_habit_nudges_user_slug_day
ON public.habit_nudges (user_id, habit_slug, scheduled_date);

-- Create secure SQL-only dispatch function
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
    INSERT INTO public.habit_nudges (user_id, habit_slug, scheduled_for, channel, meta)
    SELECT nl.user_id, nl.slug, v_now, 'fallback',
           jsonb_build_object('reason','reminder_dispatch','window_start',v_min_start::text,'window_end',v_min_end::text)
    FROM not_logged_today nl
    ON CONFLICT ON CONSTRAINT uq_habit_nudges_user_slug_day DO NOTHING
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

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if it exists (idempotent)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'dispatch-habit-reminders';

-- Schedule the SQL function to run every 5 minutes
SELECT cron.schedule(
  'dispatch-habit-reminders',
  '*/5 * * * *',
  $$ SELECT public.rpc_dispatch_habit_reminders_sql(); $$
);