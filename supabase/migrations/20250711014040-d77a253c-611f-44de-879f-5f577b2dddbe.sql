-- Create function to update timestamps (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table to track toxin/flag detections from food logs
CREATE TABLE public.toxin_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nutrition_log_id UUID REFERENCES public.nutrition_logs(id) ON DELETE CASCADE,
  toxin_type TEXT NOT NULL, -- 'inflammatory_foods', 'artificial_sweeteners', 'preservatives', 'dyes', 'seed_oils', 'gmos'
  detected_ingredients TEXT[] NOT NULL DEFAULT '{}',
  serving_count NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.toxin_detections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own toxin detections" 
ON public.toxin_detections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own toxin detections" 
ON public.toxin_detections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own toxin detections" 
ON public.toxin_detections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own toxin detections" 
ON public.toxin_detections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_toxin_detections_user_id ON public.toxin_detections(user_id);
CREATE INDEX idx_toxin_detections_created_at ON public.toxin_detections(created_at);
CREATE INDEX idx_toxin_detections_toxin_type ON public.toxin_detections(toxin_type);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_toxin_detections_updated_at
BEFORE UPDATE ON public.toxin_detections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();