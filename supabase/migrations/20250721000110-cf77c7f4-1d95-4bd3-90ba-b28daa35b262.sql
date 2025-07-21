-- Create mood_predictions table for AI predictions
CREATE TABLE public.mood_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_mood INTEGER NOT NULL CHECK (predicted_mood >= 1 AND predicted_mood <= 10),
  predicted_energy INTEGER NOT NULL CHECK (predicted_energy >= 1 AND predicted_energy <= 10),
  message TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '😊',
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
  factors TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, prediction_date)
);

-- Enable Row Level Security
ALTER TABLE public.mood_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own mood predictions" 
ON public.mood_predictions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create mood predictions" 
ON public.mood_predictions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update mood predictions" 
ON public.mood_predictions 
FOR UPDATE 
USING (true);

-- Create index for better performance
CREATE INDEX idx_mood_predictions_user_date ON public.mood_predictions(user_id, prediction_date);
CREATE INDEX idx_mood_predictions_date ON public.mood_predictions(prediction_date);