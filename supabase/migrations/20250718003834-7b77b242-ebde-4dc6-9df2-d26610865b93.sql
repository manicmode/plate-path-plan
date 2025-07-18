-- Create daily_nutrition_targets table
CREATE TABLE public.daily_nutrition_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  fiber NUMERIC,
  hydration_ml INTEGER,
  supplement_count INTEGER DEFAULT 0,
  priority_micronutrients TEXT[] DEFAULT '{}',
  flagged_ingredients TEXT[] DEFAULT '{}',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  profile_version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_nutrition_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own daily targets" 
ON public.daily_nutrition_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own daily targets" 
ON public.daily_nutrition_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily targets" 
ON public.daily_nutrition_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily targets" 
ON public.daily_nutrition_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_nutrition_targets_updated_at
BEFORE UPDATE ON public.daily_nutrition_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_daily_nutrition_targets_user_date ON public.daily_nutrition_targets(user_id, target_date);
CREATE INDEX idx_daily_nutrition_targets_calculated_at ON public.daily_nutrition_targets(calculated_at);