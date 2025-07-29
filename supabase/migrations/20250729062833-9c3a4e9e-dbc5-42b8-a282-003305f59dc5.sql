-- Create daily meditation nudge cron job
-- This job runs the triggerMeditationNudge edge function every day at 8:00 AM UTC
SELECT cron.schedule(
  'daily_meditation_nudge',
  '0 8 * * *', -- Daily at 8:00 AM UTC
  $$
  SELECT
    net.http_post(
        url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/triggerMeditationNudge',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body := json_build_object(
          'scheduled_run', true,
          'timestamp', now(),
          'job_name', 'daily_meditation_nudge'
        )::jsonb
    ) as request_id;
  $$
);