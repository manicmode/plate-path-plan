-- Schedule monthly exercise report generation on the 1st of each month at 2 AM
SELECT cron.schedule(
  'generate-monthly-exercise-reports',
  '0 2 1 * *', -- At 2:00 AM on the 1st day of every month
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/generate-monthly-exercise-reports',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"cron_trigger": true}'::jsonb
    ) as request_id;
  $$
);