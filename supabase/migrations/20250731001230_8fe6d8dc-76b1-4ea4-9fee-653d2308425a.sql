-- Create body_scans table for storing body scan images and metadata
CREATE TABLE IF NOT EXISTS public.body_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'front', 'side', 'back'
  image_url TEXT NOT NULL,
  pose_metadata JSONB,
  pose_score NUMERIC DEFAULT 0,
  scan_index INTEGER NOT NULL DEFAULT 1,
  month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  weight NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own body scans" 
ON public.body_scans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own body scans" 
ON public.body_scans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own body scans" 
ON public.body_scans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body scans" 
ON public.body_scans 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_body_scans_updated_at
  BEFORE UPDATE ON public.body_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_body_scans_user_id ON public.body_scans(user_id);
CREATE INDEX idx_body_scans_type ON public.body_scans(type);
CREATE INDEX idx_body_scans_year_month ON public.body_scans(user_id, year, month);