-- Create table for workout completion data
CREATE TABLE public.workout_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id TEXT, -- reference to routine ID or manual workout ID
  workout_type TEXT NOT NULL, -- 'ai_routine', 'manual', 'pre_made'
  duration_minutes INTEGER NOT NULL,
  exercises_count INTEGER NOT NULL DEFAULT 0,
  sets_count INTEGER NOT NULL DEFAULT 0,
  muscles_worked TEXT[] NOT NULL DEFAULT '{}',
  difficulty_feedback TEXT, -- 'too_easy', 'just_right', 'too_hard'
  journal_entry TEXT,
  motivational_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  workout_data JSONB DEFAULT '{}' -- additional workout details
);

-- Enable RLS
ALTER TABLE public.workout_completions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own workout completions" 
ON public.workout_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout completions" 
ON public.workout_completions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout completions" 
ON public.workout_completions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout completions" 
ON public.workout_completions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_workout_completions_updated_at
BEFORE UPDATE ON public.workout_completions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();