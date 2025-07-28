-- Create monthly workout awards table for trophy tracking
CREATE TABLE public.monthly_workout_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  award_level TEXT NOT NULL CHECK (award_level IN ('gold', 'silver', 'bronze', 'none')),
  workout_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure one record per user per month/year
  UNIQUE(user_id, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.monthly_workout_awards ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own monthly workout awards" 
ON public.monthly_workout_awards 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly workout awards" 
ON public.monthly_workout_awards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly workout awards" 
ON public.monthly_workout_awards 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly workout awards" 
ON public.monthly_workout_awards 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_workout_awards_updated_at
BEFORE UPDATE ON public.monthly_workout_awards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_monthly_workout_awards_user_date ON public.monthly_workout_awards(user_id, year, month);
CREATE INDEX idx_monthly_workout_awards_user_created ON public.monthly_workout_awards(user_id, created_at);