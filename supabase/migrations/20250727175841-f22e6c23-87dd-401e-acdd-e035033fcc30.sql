-- Create recovery session logs table to track completed sessions
CREATE TABLE public.recovery_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recovery_session_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recovery session logs" 
ON public.recovery_session_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery session logs" 
ON public.recovery_session_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery session logs" 
ON public.recovery_session_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery session logs" 
ON public.recovery_session_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_recovery_session_logs_user_date ON public.recovery_session_logs(user_id, completed_at DESC);
CREATE INDEX idx_recovery_session_logs_category ON public.recovery_session_logs(user_id, category, completed_at DESC);