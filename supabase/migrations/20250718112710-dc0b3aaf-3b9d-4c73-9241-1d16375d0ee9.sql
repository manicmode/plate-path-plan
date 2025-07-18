-- Schedule the yearly scores preview update to run every Sunday at 2 AM UTC
SELECT cron.schedule(
  'update-yearly-scores-preview',
  '0 2 * * 0', -- Every Sunday at 2 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/update-yearly-scores-preview',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"scheduled": true, "timestamp": "' || now()::text || '"}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger the preview update (for testing)
CREATE OR REPLACE FUNCTION public.trigger_yearly_scores_preview_update()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  SELECT net.http_post(
    url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/update-yearly-scores-preview',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
    body := '{"manual_trigger": true, "timestamp": "' || now()::text || '"}'::jsonb
  ) INTO response;
  
  RETURN response;
END;
$$;