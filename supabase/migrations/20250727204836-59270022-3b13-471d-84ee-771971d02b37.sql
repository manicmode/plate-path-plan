-- Fix search_path for security definer functions
CREATE OR REPLACE FUNCTION public.trigger_yoga_mood_nudge()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-yoga-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:=json_build_object(
          'userId', NEW.user_id::text,
          'triggerType', 'mood_submission'
        )::jsonb
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.trigger_yoga_exercise_nudge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for high-intensity workouts
  IF NEW.intensity = 'high' OR (NEW.calories_burned IS NOT NULL AND NEW.calories_burned > 400) THEN
    PERFORM
      net.http_post(
          url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-yoga-nudge',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
          body:=json_build_object(
            'userId', NEW.user_id::text,
            'triggerType', 'exercise_submission'
          )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog';