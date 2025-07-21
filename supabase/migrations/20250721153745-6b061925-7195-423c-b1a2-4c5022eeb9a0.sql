-- Unschedule the existing weekly reports job
SELECT cron.unschedule('generate-weekly-reports');

-- Create new scheduled job to run every Sunday at 8:00 PM (instead of 11:00 PM)
SELECT cron.schedule(
  'generate-weekly-reports',
  '0 20 * * 0', -- Every Sunday at 8 PM
  $$
  SELECT net.http_post(
    url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/generate-weekly-reports',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);