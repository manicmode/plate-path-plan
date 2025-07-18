-- Create enum for suggestion types
CREATE TYPE public.suggestion_type AS ENUM ('praise', 'warning', 'tip');

-- Create meal_suggestions table
CREATE TABLE public.meal_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message TEXT NOT NULL,
  type suggestion_type NOT NULL,
  score_triggered NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own meal suggestions" 
ON public.meal_suggestions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal suggestions" 
ON public.meal_suggestions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal suggestions" 
ON public.meal_suggestions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_meal_suggestions_user_id ON public.meal_suggestions(user_id);
CREATE INDEX idx_meal_suggestions_date ON public.meal_suggestions(date);
CREATE INDEX idx_meal_suggestions_user_date ON public.meal_suggestions(user_id, date);