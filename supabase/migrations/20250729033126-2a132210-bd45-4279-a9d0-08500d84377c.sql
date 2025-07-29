-- Create workout_logs table for tracking individual workout sessions from AI routines
CREATE TABLE public.workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID REFERENCES public.ai_generated_routines(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL, -- monday, tuesday, etc.
  day_index INTEGER NOT NULL, -- 0-6 for week indexing
  exercise_name TEXT NOT NULL,
  exercise_type TEXT NOT NULL DEFAULT 'strength', -- strength, cardio, flexibility
  sets_completed INTEGER DEFAULT 0,
  target_sets INTEGER DEFAULT 0,
  reps_completed TEXT DEFAULT '', -- JSON array of reps per set like "[12,10,8]"
  target_reps TEXT DEFAULT '', -- target reps like "12" or "8-12"
  weight_used NUMERIC DEFAULT 0, -- in kg or lbs
  duration_seconds INTEGER DEFAULT 0, -- for timed exercises
  notes TEXT DEFAULT '',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_sessions table for tracking complete workout sessions
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id UUID REFERENCES public.ai_generated_routines(id) ON DELETE CASCADE,
  day_name TEXT NOT NULL,
  day_index INTEGER NOT NULL,
  total_exercises INTEGER NOT NULL DEFAULT 0,
  completed_exercises INTEGER NOT NULL DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  calories_burned NUMERIC DEFAULT 0,
  session_notes TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_logs
CREATE POLICY "Users can create their own workout logs" 
ON public.workout_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout logs" 
ON public.workout_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs" 
ON public.workout_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs" 
ON public.workout_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for workout_sessions
CREATE POLICY "Users can create their own workout sessions" 
ON public.workout_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own workout sessions" 
ON public.workout_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions" 
ON public.workout_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions" 
ON public.workout_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX idx_workout_logs_user_routine ON public.workout_logs(user_id, routine_id);
CREATE INDEX idx_workout_logs_day ON public.workout_logs(day_name, day_index);
CREATE INDEX idx_workout_sessions_user_routine ON public.workout_sessions(user_id, routine_id);
CREATE INDEX idx_workout_sessions_completed ON public.workout_sessions(user_id, is_completed);

-- Add trigger for updated_at
CREATE TRIGGER update_workout_logs_updated_at
BEFORE UPDATE ON public.workout_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
BEFORE UPDATE ON public.workout_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();