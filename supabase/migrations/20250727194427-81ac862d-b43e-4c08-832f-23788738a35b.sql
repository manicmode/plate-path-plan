-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the meditation nudge function to run daily at 9:00 AM
SELECT cron.schedule(
  'daily-meditation-nudge',
  '0 9 * * *', -- Every day at 9:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-meditation-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"triggerType": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to trigger nudges on mood submission
CREATE OR REPLACE FUNCTION trigger_mood_nudge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-meditation-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:=json_build_object(
          'userId', NEW.user_id::text,
          'triggerType', 'mood_submission'
        )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mood log submissions (only for low mood)
CREATE OR REPLACE TRIGGER mood_submission_nudge_trigger
  AFTER INSERT ON mood_logs
  FOR EACH ROW
  WHEN (NEW.mood IS NOT NULL AND NEW.mood < 3)
  EXECUTE FUNCTION trigger_mood_nudge();

-- Create a function to trigger nudges on exercise submission (if exercise table exists)
-- Note: This assumes there's an exercise_logs table - adjust table name as needed
CREATE OR REPLACE FUNCTION trigger_exercise_nudge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for high-intensity workouts
  IF NEW.intensity = 'high' OR (NEW.calories_burned IS NOT NULL AND NEW.calories_burned > 400) THEN
    PERFORM
      net.http_post(
          url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-meditation-nudge',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
          body:=json_build_object(
            'userId', NEW.user_id::text,
            'triggerType', 'exercise_submission'
          )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncomment and adjust the table name when you have an exercise logging table
-- CREATE OR REPLACE TRIGGER exercise_submission_nudge_trigger
--   AFTER INSERT ON exercise_logs
--   FOR EACH ROW
--   EXECUTE FUNCTION trigger_exercise_nudge();