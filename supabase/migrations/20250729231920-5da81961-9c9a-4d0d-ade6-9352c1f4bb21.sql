-- Create custom_routines table for user-created workout routines
CREATE TABLE public.custom_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  routine_type TEXT NOT NULL DEFAULT 'custom',
  duration TEXT NOT NULL,
  weekly_plan JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_routines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access control
CREATE POLICY "Users can view their own custom routines" 
ON public.custom_routines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom routines" 
ON public.custom_routines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom routines" 
ON public.custom_routines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom routines" 
ON public.custom_routines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_routines_updated_at
BEFORE UPDATE ON public.custom_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();