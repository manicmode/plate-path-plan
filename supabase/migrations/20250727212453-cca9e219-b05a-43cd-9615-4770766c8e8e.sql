-- Create thermotherapy reminders table
CREATE TABLE public.thermotherapy_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  time_of_day TIME WITHOUT TIME ZONE NOT NULL DEFAULT '06:30:00'::time without time zone,
  recurrence TEXT NOT NULL DEFAULT 'daily'::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for thermotherapy_reminders
ALTER TABLE public.thermotherapy_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for thermotherapy_reminders
CREATE POLICY "Users can create their own thermotherapy reminders" 
ON public.thermotherapy_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own thermotherapy reminders" 
ON public.thermotherapy_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own thermotherapy reminders" 
ON public.thermotherapy_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thermotherapy reminders" 
ON public.thermotherapy_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create thermotherapy streaks table
CREATE TABLE public.thermotherapy_streaks (
  user_id UUID NOT NULL PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for thermotherapy_streaks
ALTER TABLE public.thermotherapy_streaks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for thermotherapy_streaks
CREATE POLICY "Users can create their own thermotherapy streaks" 
ON public.thermotherapy_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own thermotherapy streaks" 
ON public.thermotherapy_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own thermotherapy streaks" 
ON public.thermotherapy_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create thermotherapy nudges table
CREATE TABLE public.thermotherapy_nudges (
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

-- Enable RLS for thermotherapy_nudges
ALTER TABLE public.thermotherapy_nudges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for thermotherapy_nudges
CREATE POLICY "System can create thermotherapy nudges" 
ON public.thermotherapy_nudges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own thermotherapy nudges" 
ON public.thermotherapy_nudges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own thermotherapy nudges" 
ON public.thermotherapy_nudges 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create thermotherapy nudge preferences table
CREATE TABLE public.thermotherapy_nudge_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for thermotherapy_nudge_preferences
ALTER TABLE public.thermotherapy_nudge_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for thermotherapy_nudge_preferences
CREATE POLICY "Users can create their own thermotherapy nudge preferences" 
ON public.thermotherapy_nudge_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own thermotherapy nudge preferences" 
ON public.thermotherapy_nudge_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own thermotherapy nudge preferences" 
ON public.thermotherapy_nudge_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thermotherapy nudge preferences" 
ON public.thermotherapy_nudge_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add update trigger for thermotherapy_reminders
CREATE TRIGGER update_thermotherapy_reminders_updated_at
BEFORE UPDATE ON public.thermotherapy_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for thermotherapy_streaks
CREATE TRIGGER update_thermotherapy_streaks_updated_at
BEFORE UPDATE ON public.thermotherapy_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for thermotherapy_nudges
CREATE TRIGGER update_thermotherapy_nudges_updated_at
BEFORE UPDATE ON public.thermotherapy_nudges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger for thermotherapy_nudge_preferences
CREATE TRIGGER update_thermotherapy_nudge_preferences_updated_at
BEFORE UPDATE ON public.thermotherapy_nudge_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();