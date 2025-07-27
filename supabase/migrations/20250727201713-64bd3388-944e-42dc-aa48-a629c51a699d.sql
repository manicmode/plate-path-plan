-- Create breathing_nudge_preferences table
CREATE TABLE public.breathing_nudge_preferences (
  user_id UUID NOT NULL PRIMARY KEY,
  nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.breathing_nudge_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own breathing nudge preferences" 
ON public.breathing_nudge_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own breathing nudge preferences" 
ON public.breathing_nudge_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breathing nudge preferences" 
ON public.breathing_nudge_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own breathing nudge preferences" 
ON public.breathing_nudge_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_breathing_nudge_preferences_updated_at
BEFORE UPDATE ON public.breathing_nudge_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create breathing_reminders table
CREATE TABLE public.breathing_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reminder_time TEXT NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_breathing_reminder_per_user UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.breathing_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for breathing_reminders
CREATE POLICY "Users can view their own breathing reminders" 
ON public.breathing_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own breathing reminders" 
ON public.breathing_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breathing reminders" 
ON public.breathing_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own breathing reminders" 
ON public.breathing_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_breathing_reminders_updated_at
BEFORE UPDATE ON public.breathing_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();