-- Create meditation_reminders table
CREATE TABLE IF NOT EXISTS public.meditation_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  recurrence TEXT NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meditation_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own meditation reminders" 
ON public.meditation_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meditation reminders" 
ON public.meditation_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meditation reminders" 
ON public.meditation_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meditation reminders" 
ON public.meditation_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_meditation_reminders_updated_at
BEFORE UPDATE ON public.meditation_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();