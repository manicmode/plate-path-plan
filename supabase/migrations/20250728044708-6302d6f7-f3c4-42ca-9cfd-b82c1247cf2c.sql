-- Create exercise_goals table for smart workout goal tracking
CREATE TABLE public.exercise_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weekly_target_minutes INTEGER NOT NULL DEFAULT 120, -- default 2 hrs/week
  sessions_per_week_target INTEGER NOT NULL DEFAULT 3,
  ai_adjusted BOOLEAN NOT NULL DEFAULT FALSE,
  last_adjusted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercise_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own exercise goals" 
ON public.exercise_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise goals" 
ON public.exercise_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise goals" 
ON public.exercise_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise goals" 
ON public.exercise_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_exercise_goals_updated_at
BEFORE UPDATE ON public.exercise_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();