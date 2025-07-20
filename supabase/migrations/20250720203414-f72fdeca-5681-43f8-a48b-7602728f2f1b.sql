-- Schedule the yearly hall of fame function to run on December 31st at 11:59 PM
SELECT cron.schedule(
  'yearly-hall-of-fame',
  '59 23 31 12 *', -- At 11:59 PM on December 31st
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/yearly-hall-of-fame',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"trigger": "yearly_cron", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);