-- Create saved_health_reports table for individual report saves
CREATE TABLE public.saved_health_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('photo', 'barcode', 'manual', 'voice')),
  image_url TEXT,
  barcode TEXT,
  portion_grams NUMERIC,
  quality_score INTEGER DEFAULT 0,
  report_snapshot JSONB NOT NULL DEFAULT '{}',
  source_meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_meal_set_reports table for multi-item report sets
CREATE TABLE public.saved_meal_set_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  overall_score INTEGER DEFAULT 0,
  items_snapshot JSONB NOT NULL DEFAULT '[]',
  report_snapshot JSONB NOT NULL DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meal_set_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_health_reports
CREATE POLICY "Users can view their own saved health reports" 
ON public.saved_health_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved health reports" 
ON public.saved_health_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved health reports" 
ON public.saved_health_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved health reports" 
ON public.saved_health_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for saved_meal_set_reports
CREATE POLICY "Users can view their own saved meal set reports" 
ON public.saved_meal_set_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved meal set reports" 
ON public.saved_meal_set_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved meal set reports" 
ON public.saved_meal_set_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved meal set reports" 
ON public.saved_meal_set_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Set up user_id triggers
CREATE TRIGGER set_saved_health_reports_user_id
  BEFORE INSERT ON public.saved_health_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrition_logs_set_user();

CREATE TRIGGER set_saved_meal_set_reports_user_id
  BEFORE INSERT ON public.saved_meal_set_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.nutrition_logs_set_user();

-- Set up updated_at triggers
CREATE TRIGGER update_saved_health_reports_updated_at
  BEFORE UPDATE ON public.saved_health_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_meal_set_reports_updated_at
  BEFORE UPDATE ON public.saved_meal_set_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_saved_health_reports_user_created ON public.saved_health_reports(user_id, created_at DESC);
CREATE INDEX idx_saved_meal_set_reports_user_created ON public.saved_meal_set_reports(user_id, created_at DESC);