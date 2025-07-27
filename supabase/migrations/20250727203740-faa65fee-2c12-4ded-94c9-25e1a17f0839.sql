-- Create breathing_streaks table
CREATE TABLE public.breathing_streaks (
  user_id UUID NOT NULL PRIMARY KEY,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.breathing_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own breathing streaks" 
ON public.breathing_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own breathing streaks" 
ON public.breathing_streaks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own breathing streaks" 
ON public.breathing_streaks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_breathing_streaks_updated_at
BEFORE UPDATE ON public.breathing_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();