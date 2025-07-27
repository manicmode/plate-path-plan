-- Create sleep_reminders table
CREATE TABLE public.sleep_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  time_of_day TIME WITHOUT TIME ZONE NOT NULL DEFAULT '21:30:00'::time without time zone,
  recurrence TEXT NOT NULL DEFAULT 'daily'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sleep_reminders
ALTER TABLE public.sleep_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sleep_reminders
CREATE POLICY "Users can view their own sleep reminders" 
ON public.sleep_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep reminders" 
ON public.sleep_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep reminders" 
ON public.sleep_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep reminders" 
ON public.sleep_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create sleep_nudge_preferences table
CREATE TABLE public.sleep_nudge_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sleep_nudge_preferences
ALTER TABLE public.sleep_nudge_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sleep_nudge_preferences
CREATE POLICY "Users can view their own sleep nudge preferences" 
ON public.sleep_nudge_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep nudge preferences" 
ON public.sleep_nudge_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep nudge preferences" 
ON public.sleep_nudge_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep nudge preferences" 
ON public.sleep_nudge_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create sleep_streaks table
CREATE TABLE public.sleep_streaks (
  user_id UUID NOT NULL PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sleep_streaks
ALTER TABLE public.sleep_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sleep_streaks
CREATE POLICY "Users can view their own sleep streaks" 
ON public.sleep_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep streaks" 
ON public.sleep_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep streaks" 
ON public.sleep_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create sleep_nudges table
CREATE TABLE public.sleep_nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nudge_type TEXT NOT NULL,
  nudge_reason TEXT NOT NULL,
  nudge_message TEXT NOT NULL,
  user_action TEXT NOT NULL DEFAULT 'pending'::text,
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sleep_nudges
ALTER TABLE public.sleep_nudges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sleep_nudges
CREATE POLICY "Users can view their own sleep nudges" 
ON public.sleep_nudges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create sleep nudges" 
ON public.sleep_nudges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own sleep nudges" 
ON public.sleep_nudges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_sleep_reminders_updated_at
BEFORE UPDATE ON public.sleep_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_nudge_preferences_updated_at
BEFORE UPDATE ON public.sleep_nudge_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_streaks_updated_at
BEFORE UPDATE ON public.sleep_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_nudges_updated_at
BEFORE UPDATE ON public.sleep_nudges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sleep nudge trigger functions
CREATE OR REPLACE FUNCTION public.trigger_sleep_mood_nudge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  PERFORM
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-sleep-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:=json_build_object(
          'userId', NEW.user_id::text,
          'triggerType', 'mood_submission'
        )::jsonb
    );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_sleep_exercise_nudge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Only trigger for evening workouts (after 7pm) or high-intensity workouts
  IF (EXTRACT(HOUR FROM NEW.created_at) >= 19) OR 
     (NEW.intensity = 'high' OR (NEW.calories_burned IS NOT NULL AND NEW.calories_burned > 400)) THEN
    PERFORM
      net.http_post(
          url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-sleep-nudge',
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

-- Create triggers on mood_logs and exercise_logs for sleep nudges
CREATE TRIGGER mood_logs_sleep_nudge_trigger
AFTER INSERT ON public.mood_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sleep_mood_nudge();

CREATE TRIGGER exercise_logs_sleep_nudge_trigger
AFTER INSERT ON public.exercise_logs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sleep_exercise_nudge();

-- Create CRON job for daily sleep nudges at 9:30 PM
SELECT cron.schedule(
  'daily-sleep-nudge',
  '30 21 * * *', -- 9:30 PM daily
  $$
  SELECT
    net.http_post(
        url:='https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/trigger-sleep-nudge',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
        body:='{"triggerType": "daily_reminder", "time": "21:30"}'::jsonb
    ) as request_id;
  $$
);