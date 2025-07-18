-- Create meal_scores table for storing health quality scores
CREATE TABLE public.meal_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_id UUID REFERENCES public.nutrition_logs(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  rating_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own meal scores" 
ON public.meal_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal scores" 
ON public.meal_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal scores" 
ON public.meal_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal scores" 
ON public.meal_scores 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_meal_scores_user_id ON public.meal_scores(user_id);
CREATE INDEX idx_meal_scores_meal_id ON public.meal_scores(meal_id);