-- Create AI generated routines table
CREATE TABLE public.ai_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  routine_name TEXT NOT NULL,
  routine_goal TEXT NOT NULL,
  split_type TEXT NOT NULL,
  days_per_week INTEGER NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  fitness_level TEXT NOT NULL,
  equipment_needed TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE DEFAULT NULL,
  current_week INTEGER DEFAULT 1,
  current_day_in_week INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  locked_days JSONB DEFAULT '{}',
  routine_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_routines ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_routines
CREATE POLICY "Users can view their own AI routines" 
ON public.ai_routines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI routines" 
ON public.ai_routines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI routines" 
ON public.ai_routines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI routines" 
ON public.ai_routines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_routines_updated_at
BEFORE UPDATE ON public.ai_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();