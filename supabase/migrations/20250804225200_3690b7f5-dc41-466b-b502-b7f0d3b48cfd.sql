-- Create workout_feedback table for post-workout AI interactions
CREATE TABLE public.workout_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_log_id UUID,
  routine_id TEXT,
  workout_title TEXT,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  sets_skipped INTEGER NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  workout_duration_minutes INTEGER,
  intensity_level TEXT,
  mood_label TEXT NOT NULL,
  emoji TEXT NOT NULL,
  coach_comment TEXT NOT NULL,
  user_response TEXT,
  user_response_emoji TEXT,
  performance_score NUMERIC,
  adaptation_suggestions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own workout feedback" 
ON public.workout_feedback 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout feedback" 
ON public.workout_feedback 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout feedback" 
ON public.workout_feedback 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_workout_feedback_user_id ON public.workout_feedback(user_id);
CREATE INDEX idx_workout_feedback_created_at ON public.workout_feedback(created_at DESC);

-- Add trigger for updating timestamps
CREATE TRIGGER update_workout_feedback_updated_at
BEFORE UPDATE ON public.workout_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();