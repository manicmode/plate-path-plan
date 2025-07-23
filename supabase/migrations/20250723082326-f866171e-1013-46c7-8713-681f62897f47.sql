-- Create a table for yearly exercise reports
CREATE TABLE public.yearly_exercise_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year_start DATE NOT NULL,
  year_end DATE NOT NULL,
  total_workouts_completed INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER NOT NULL DEFAULT 0,
  total_calories_burned NUMERIC NOT NULL DEFAULT 0,
  days_active INTEGER NOT NULL DEFAULT 0,
  days_skipped INTEGER NOT NULL DEFAULT 0,
  most_frequent_muscle_groups TEXT[] DEFAULT '{}',
  missed_muscle_groups TEXT[] DEFAULT '{}',
  year_over_year_progress JSONB DEFAULT '{}',
  motivational_title TEXT NOT NULL,
  personalized_message TEXT NOT NULL,
  smart_suggestions TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year_start)
);

-- Enable Row Level Security
ALTER TABLE public.yearly_exercise_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own yearly exercise reports" 
ON public.yearly_exercise_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create yearly exercise reports" 
ON public.yearly_exercise_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update yearly exercise reports" 
ON public.yearly_exercise_reports 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_yearly_exercise_reports_updated_at
BEFORE UPDATE ON public.yearly_exercise_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();