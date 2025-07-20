-- Create a scheduled function to trigger mood notifications
-- This creates a cron job that runs daily at 8:30 PM (20:30)
SELECT cron.schedule(
    'daily-mood-notifications',
    '30 20 * * *', -- 8:30 PM daily
    $$
    SELECT
      net.http_post(
          url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/schedule-mood-notifications',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
          body:='{"trigger_type": "daily_mood_reminder", "timestamp": "' || now()::text || '"}'::jsonb
      ) as request_id;
    $$
);