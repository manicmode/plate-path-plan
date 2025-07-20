-- Create missing daily_performance_scores table
CREATE TABLE IF NOT EXISTS public.daily_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  nutrition_score NUMERIC DEFAULT 0,
  hydration_score NUMERIC DEFAULT 0,
  supplement_score NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  meals_logged INTEGER DEFAULT 0,
  quality_average NUMERIC DEFAULT 0,
  streak_bonus NUMERIC DEFAULT 0,
  consistency_score NUMERIC DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_performance_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own performance scores" 
ON public.daily_performance_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance scores" 
ON public.daily_performance_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance scores" 
ON public.daily_performance_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Test the badge awarding function
SELECT public.check_and_award_all_badges(auth.uid()) as badge_test_result;