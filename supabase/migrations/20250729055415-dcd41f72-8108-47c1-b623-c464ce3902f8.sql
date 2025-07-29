-- Recreate ai_predictions table
CREATE TABLE IF NOT EXISTS public.ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prediction_type text NOT NULL CHECK (prediction_type IN ('meal_time', 'exercise_time', 'mood_pattern', 'hydration')),
  predicted_value text,
  confidence numeric,
  context jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI predictions"
  ON public.ai_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI predictions"
  ON public.ai_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);