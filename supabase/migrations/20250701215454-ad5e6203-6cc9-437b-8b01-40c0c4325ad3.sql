
-- Create a table to store food recognition results
CREATE TABLE public.food_recognitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  image_url TEXT,
  detected_labels TEXT[],
  confidence_scores DECIMAL[],
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_recognitions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own food recognitions" 
  ON public.food_recognitions 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create food recognitions" 
  ON public.food_recognitions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Create a table to store nutrition data
CREATE TABLE public.nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  food_name TEXT NOT NULL,
  calories INTEGER,
  protein DECIMAL,
  carbs DECIMAL,
  fat DECIMAL,
  fiber DECIMAL,
  sugar DECIMAL,
  sodium DECIMAL,
  serving_size TEXT,
  confidence INTEGER,
  source TEXT DEFAULT 'vision_api',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own nutrition logs" 
  ON public.nutrition_logs 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create nutrition logs" 
  ON public.nutrition_logs 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own nutrition logs" 
  ON public.nutrition_logs 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition logs" 
  ON public.nutrition_logs 
  FOR DELETE 
  USING (auth.uid() = user_id);
