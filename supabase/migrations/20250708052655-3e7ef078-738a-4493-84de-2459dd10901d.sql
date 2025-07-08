-- Create hydration logs table
CREATE TABLE public.hydration_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  volume INTEGER NOT NULL, -- in ml
  type TEXT NOT NULL DEFAULT 'water',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for hydration logs
CREATE POLICY "Users can view their own hydration logs" 
ON public.hydration_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own hydration logs" 
ON public.hydration_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hydration logs" 
ON public.hydration_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hydration logs" 
ON public.hydration_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create supplements logs table
CREATE TABLE public.supplement_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  frequency TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for supplement logs
CREATE POLICY "Users can view their own supplement logs" 
ON public.supplement_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own supplement logs" 
ON public.supplement_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own supplement logs" 
ON public.supplement_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own supplement logs" 
ON public.supplement_logs 
FOR DELETE 
USING (auth.uid() = user_id);