-- Create yoga_reminders table
CREATE TABLE public.yoga_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  time_of_day TIME NOT NULL DEFAULT '09:00:00',
  recurrence TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yoga_reminders
ALTER TABLE public.yoga_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yoga_reminders
CREATE POLICY "Users can view their own yoga reminders" 
ON public.yoga_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own yoga reminders" 
ON public.yoga_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yoga reminders" 
ON public.yoga_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yoga reminders" 
ON public.yoga_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create yoga_nudge_preferences table
CREATE TABLE public.yoga_nudge_preferences (
  user_id UUID PRIMARY KEY,
  nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yoga_nudge_preferences
ALTER TABLE public.yoga_nudge_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yoga_nudge_preferences
CREATE POLICY "Users can view their own yoga nudge preferences" 
ON public.yoga_nudge_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own yoga nudge preferences" 
ON public.yoga_nudge_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yoga nudge preferences" 
ON public.yoga_nudge_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own yoga nudge preferences" 
ON public.yoga_nudge_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create yoga_streaks table
CREATE TABLE public.yoga_streaks (
  user_id UUID PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yoga_streaks
ALTER TABLE public.yoga_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yoga_streaks
CREATE POLICY "Users can view their own yoga streaks" 
ON public.yoga_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own yoga streaks" 
ON public.yoga_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own yoga streaks" 
ON public.yoga_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create yoga_nudges table
CREATE TABLE public.yoga_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nudge_type TEXT NOT NULL,
  nudge_reason TEXT NOT NULL,
  nudge_message TEXT NOT NULL,
  user_action TEXT NOT NULL DEFAULT 'pending',
  delivered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on yoga_nudges
ALTER TABLE public.yoga_nudges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yoga_nudges
CREATE POLICY "Users can view their own yoga nudges" 
ON public.yoga_nudges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create yoga nudges" 
ON public.yoga_nudges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own yoga nudges" 
ON public.yoga_nudges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates on yoga_reminders
CREATE TRIGGER update_yoga_reminders_updated_at
  BEFORE UPDATE ON public.yoga_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on yoga_nudge_preferences
CREATE TRIGGER update_yoga_nudge_preferences_updated_at
  BEFORE UPDATE ON public.yoga_nudge_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on yoga_streaks
CREATE TRIGGER update_yoga_streaks_updated_at
  BEFORE UPDATE ON public.yoga_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automatic timestamp updates on yoga_nudges
CREATE TRIGGER update_yoga_nudges_updated_at
  BEFORE UPDATE ON public.yoga_nudges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create triggers for yoga nudges on mood logs (low mood trigger)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for yoga nudges on exercise logs (intense exercise trigger)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers to mood_logs table for yoga nudges
CREATE TRIGGER trigger_yoga_mood_nudge
  AFTER INSERT ON public.mood_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_yoga_mood_nudge();

-- Add triggers to exercise_logs table for yoga nudges (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exercise_logs') THEN
    CREATE TRIGGER trigger_yoga_exercise_nudge
      AFTER INSERT ON public.exercise_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_yoga_exercise_nudge();
  END IF;
END $$;