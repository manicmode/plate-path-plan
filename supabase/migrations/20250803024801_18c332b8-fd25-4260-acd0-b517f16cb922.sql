-- Create table for manual nutrition targets
CREATE TABLE public.manual_nutrition_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  calories INTEGER,
  protein INTEGER,
  carbs INTEGER,
  fat INTEGER,
  fiber INTEGER,
  sugar INTEGER,
  sodium INTEGER,
  saturated_fat INTEGER,
  hydration_ml INTEGER,
  supplement_count INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.manual_nutrition_targets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own manual targets" 
ON public.manual_nutrition_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own manual targets" 
ON public.manual_nutrition_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual targets" 
ON public.manual_nutrition_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual targets" 
ON public.manual_nutrition_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_manual_nutrition_targets_updated_at
BEFORE UPDATE ON public.manual_nutrition_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for one record per user
ALTER TABLE public.manual_nutrition_targets 
ADD CONSTRAINT manual_nutrition_targets_user_id_unique UNIQUE (user_id);