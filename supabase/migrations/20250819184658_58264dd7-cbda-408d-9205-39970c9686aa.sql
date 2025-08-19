-- Set the cron token at database level (ensure it persists for pg_cron)
ALTER DATABASE postgres 
SET app.settings.cron_token = 'cron_habit_nudges_token_2025_secure_64char_random_string_abc123def456';

-- Set for current session
SELECT set_config('app.settings.cron_token', 'cron_habit_nudges_token_2025_secure_64char_random_string_abc123def456', false);

-- Re-schedule the cron job to pick up the new token
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'deliver-habit-nudges';

SELECT cron.schedule(
  'deliver-habit-nudges',
  '*/2 * * * *',
  $$ SELECT public.rpc_dispatch_habit_reminders_sql(); $$
);

-- Verification queries
-- A) Confirm GUC is persisted
SELECT d.datname, s.setconfig
FROM pg_db_role_setting s
JOIN pg_database d ON d.oid = s.setdatabase
WHERE d.datname = 'postgres';

-- B) Confirm pg_cron sees the token
SELECT current_setting('app.settings.cron_token', true) as token_value;

-- C) Test the edge function with token
SELECT net.http_post(
  url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/deliverHabitNudges',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer ' || current_setting('app.settings.cron_token', true)
  ),
  body := jsonb_build_object('trigger','manual','ts', now()::text)
) as auth_test;

-- D) Test without auth header (should get 403)
SELECT net.http_post(
  url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/deliverHabitNudges',
  headers := jsonb_build_object('Content-Type','application/json'),
  body := jsonb_build_object('trigger','manual','ts', now()::text)
) as no_auth_test;

-- E) Check job status
SELECT jobid, jobname, schedule, last_run, last_success
FROM cron.job
WHERE jobname = 'deliver-habit-nudges';