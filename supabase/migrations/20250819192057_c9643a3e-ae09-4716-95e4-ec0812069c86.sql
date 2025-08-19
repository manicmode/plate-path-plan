BEGIN;

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net;  -- needed for net.http_post

-- 1) Private schema + table
CREATE SCHEMA IF NOT EXISTS private;

-- Ensure schema owner is postgres (or your DB owner)
ALTER SCHEMA private OWNER TO postgres;

CREATE TABLE IF NOT EXISTS private.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Tighten permissions (idempotent)
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA private TO postgres, service_role;

-- Future tables in private inherit the same perms
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA private
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA private
  GRANT SELECT ON TABLES TO postgres, service_role;

-- 3) Seed/rotate cron token (replace value with a 64+ char random secret)
INSERT INTO private.app_settings(key, value)
VALUES ('cron_token', 'cron_habit_nudges_token_2025_secure_64char_random_string_abc123def456')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value, updated_at = now();

-- 4) Recreate CRON job: unschedule if exists, then schedule
--    Note: SELECT ... WHERE jobname = ... may return 0 rows; that's OK.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'deliver-habit-nudges';

-- Schedule every 2 minutes with a 10s timeout and minimal logging
SELECT cron.schedule(
  'deliver-habit-nudges',
  '*/2 * * * *',
  $func$
  WITH tok AS (
    SELECT value AS token
    FROM private.app_settings
    WHERE key = 'cron_token'
  )
  SELECT net.http_post(
    url     := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/deliverHabitNudges',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (SELECT token FROM tok)
    ),
    body    := jsonb_build_object('trigger','cron','ts', now()::text),
    timeout_milliseconds := 10000  -- 10s
  ) AS result;
  $func$
);

COMMIT;