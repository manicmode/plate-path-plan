-- Create routine_history table for tracking completed workout sessions
CREATE TABLE public.routine_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_id TEXT NOT NULL,
  date_completed DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER NOT NULL,
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  skipped_steps TEXT[] NOT NULL DEFAULT '{}',
  completion_score INTEGER DEFAULT NULL,
  ai_feedback TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.routine_history ENABLE ROW LEVEL SECURITY;

-- Create policies for routine_history
CREATE POLICY "Users can view their own routine history" 
ON public.routine_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routine history" 
ON public.routine_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routine history" 
ON public.routine_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routine history" 
ON public.routine_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_routine_history_updated_at
BEFORE UPDATE ON public.routine_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();