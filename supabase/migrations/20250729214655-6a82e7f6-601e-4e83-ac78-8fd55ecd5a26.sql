-- Create table to store workout performance data and adaptations
CREATE TABLE public.workout_adaptations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  original_workout_data JSONB NOT NULL DEFAULT '{}',
  adapted_workout_data JSONB NOT NULL DEFAULT '{}',
  performance_metrics JSONB NOT NULL DEFAULT '{}',
  adaptation_reasons JSONB NOT NULL DEFAULT '{}',
  ai_coach_feedback TEXT,
  adaptation_type TEXT NOT NULL, -- 'increase_intensity', 'decrease_difficulty', 'adjust_rest', 'maintain_current'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workout_adaptations ENABLE ROW LEVEL SECURITY;

-- Create policies for workout adaptations
CREATE POLICY "Users can create their own workout adaptations" 
ON public.workout_adaptations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout adaptations" 
ON public.workout_adaptations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout adaptations" 
ON public.workout_adaptations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout adaptations" 
ON public.workout_adaptations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create table to store detailed workout performance logs
CREATE TABLE public.workout_performance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID NOT NULL,
  week_number INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  workout_title TEXT NOT NULL,
  total_duration_minutes INTEGER NOT NULL,
  planned_duration_minutes INTEGER,
  completed_exercises_count INTEGER NOT NULL DEFAULT 0,
  total_exercises_count INTEGER NOT NULL DEFAULT 0,
  completed_sets_count INTEGER NOT NULL DEFAULT 0,
  total_sets_count INTEGER NOT NULL DEFAULT 0,
  skipped_steps_count INTEGER NOT NULL DEFAULT 0,
  extra_rest_seconds INTEGER NOT NULL DEFAULT 0,
  difficulty_rating TEXT, -- 'too_easy', 'just_right', 'too_hard'
  energy_level INTEGER, -- 1-5 scale
  performance_score NUMERIC, -- calculated score based on completion %
  muscle_groups_worked TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.workout_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for performance logs
CREATE POLICY "Users can create their own performance logs" 
ON public.workout_performance_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own performance logs" 
ON public.workout_performance_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance logs" 
ON public.workout_performance_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_workout_adaptations_user_routine ON public.workout_adaptations(user_id, routine_id);
CREATE INDEX idx_workout_adaptations_week_day ON public.workout_adaptations(week_number, day_number);
CREATE INDEX idx_performance_logs_user_routine ON public.workout_performance_logs(user_id, routine_id);
CREATE INDEX idx_performance_logs_week_day ON public.workout_performance_logs(week_number, day_number);

-- Create function to calculate performance score
CREATE OR REPLACE FUNCTION public.calculate_performance_score(
  completed_sets INTEGER,
  total_sets INTEGER,
  completed_exercises INTEGER,
  total_exercises INTEGER,
  skipped_steps INTEGER,
  difficulty_rating TEXT
) RETURNS NUMERIC AS $$
DECLARE
  completion_score NUMERIC;
  difficulty_bonus NUMERIC;
  skip_penalty NUMERIC;
  final_score NUMERIC;
BEGIN
  -- Base completion score (0-70 points)
  completion_score := LEAST(70, (completed_sets::NUMERIC / NULLIF(total_sets, 0)) * 50 + 
                                (completed_exercises::NUMERIC / NULLIF(total_exercises, 0)) * 20);
  
  -- Difficulty bonus (0-20 points)
  difficulty_bonus := CASE 
    WHEN difficulty_rating = 'too_hard' THEN 20
    WHEN difficulty_rating = 'just_right' THEN 15
    WHEN difficulty_rating = 'too_easy' THEN 5
    ELSE 10
  END;
  
  -- Skip penalty (0-10 points deduction)
  skip_penalty := LEAST(10, skipped_steps * 2);
  
  -- Calculate final score (0-100)
  final_score := GREATEST(0, completion_score + difficulty_bonus - skip_penalty);
  
  RETURN ROUND(final_score, 1);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update performance score
CREATE OR REPLACE FUNCTION public.update_performance_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.performance_score := public.calculate_performance_score(
    NEW.completed_sets_count,
    NEW.total_sets_count,
    NEW.completed_exercises_count,
    NEW.total_exercises_count,
    NEW.skipped_steps_count,
    NEW.difficulty_rating
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_score
  BEFORE INSERT OR UPDATE ON public.workout_performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_performance_score();