-- Create weekly_exercise_insights table for storing AI-generated weekly workout analysis
CREATE TABLE public.weekly_exercise_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Analysis data
  workouts_completed INTEGER NOT NULL DEFAULT 0,
  days_skipped INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_calories_burned NUMERIC NOT NULL DEFAULT 0,
  most_frequent_muscle_groups TEXT[] DEFAULT '{}',
  missed_target_areas TEXT[] DEFAULT '{}',
  volume_trend TEXT, -- 'increasing', 'decreasing', 'stable'
  
  -- Generated insights
  motivational_headline TEXT NOT NULL,
  progress_message TEXT NOT NULL,
  suggestion_tip TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_exercise_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own weekly insights" 
ON public.weekly_exercise_insights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create weekly insights" 
ON public.weekly_exercise_insights 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update weekly insights" 
ON public.weekly_exercise_insights 
FOR UPDATE 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_weekly_exercise_insights_user_id ON public.weekly_exercise_insights(user_id);
CREATE INDEX idx_weekly_exercise_insights_week_start ON public.weekly_exercise_insights(week_start_date);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_exercise_insights_updated_at
BEFORE UPDATE ON public.weekly_exercise_insights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();