-- Create pg_cron job for habit reminder dispatch

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent: unschedule if it already exists
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'dispatch-habit-reminders';

-- Schedule every 5 minutes
SELECT cron.schedule(
  'dispatch-habit-reminders',
  '*/5 * * * *',
  $$ SELECT public.rpc_dispatch_habit_reminders_sql(); $$
);