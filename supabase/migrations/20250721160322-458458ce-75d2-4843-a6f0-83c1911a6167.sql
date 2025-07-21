
-- Create exercise_logs table for tracking user exercise activities
CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'general',
  duration_minutes INTEGER,
  intensity_level TEXT DEFAULT 'moderate',
  steps INTEGER,
  calories_burned NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view their own exercise logs" 
ON public.exercise_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exercise logs" 
ON public.exercise_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs" 
ON public.exercise_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs" 
ON public.exercise_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_exercise_logs_user_id ON public.exercise_logs(user_id);
CREATE INDEX idx_exercise_logs_created_at ON public.exercise_logs(created_at);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exercise_logs_updated_at
BEFORE UPDATE ON public.exercise_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
