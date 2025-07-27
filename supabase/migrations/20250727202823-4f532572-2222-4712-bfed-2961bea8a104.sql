-- Create breathing_nudges table (same structure as meditation_nudge_history)
CREATE TABLE public.breathing_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nudge_type TEXT NOT NULL,
  nudge_reason TEXT NOT NULL,
  nudge_message TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_action TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.breathing_nudges ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own breathing nudges" 
ON public.breathing_nudges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create breathing nudges" 
ON public.breathing_nudges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own breathing nudges" 
ON public.breathing_nudges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_breathing_nudges_updated_at
BEFORE UPDATE ON public.breathing_nudges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to trigger breathing nudge on mood logs
CREATE OR REPLACE FUNCTION public.trigger_breathing_mood_nudge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  PERFORM
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-breathing-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:=json_build_object(
          'userId', NEW.user_id::text,
          'triggerType', 'mood_submission'
        )::jsonb
    );
  RETURN NEW;
END;
$function$;

-- Create trigger on mood_logs for breathing nudges
CREATE TRIGGER trigger_breathing_nudge_on_mood
AFTER INSERT ON public.mood_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_breathing_mood_nudge();

-- Create function to trigger breathing nudge on exercise logs
CREATE OR REPLACE FUNCTION public.trigger_breathing_exercise_nudge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Only trigger for high-intensity workouts
  IF NEW.intensity = 'high' OR (NEW.calories_burned IS NOT NULL AND NEW.calories_burned > 400) THEN
    PERFORM
      net.http_post(
          url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-breathing-nudge',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
          body:=json_build_object(
            'userId', NEW.user_id::text,
            'triggerType', 'exercise_submission'
          )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on exercise_logs for breathing nudges (assuming exercise_logs table exists)
-- CREATE TRIGGER trigger_breathing_nudge_on_exercise
-- AFTER INSERT ON public.exercise_logs
-- FOR EACH ROW
-- EXECUTE FUNCTION public.trigger_breathing_exercise_nudge();

-- Create CRON job for daily breathing nudges at 9AM
SELECT cron.schedule(
  'daily-breathing-nudge-check',
  '0 9 * * *', -- 9 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-breathing-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"triggerType": "cron"}'::jsonb
    ) as request_id;
  $$
);