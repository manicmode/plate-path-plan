-- Create body_scan_results table for muscle group scores
CREATE TABLE public.body_scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  body_scan_id UUID NOT NULL,
  chest_score NUMERIC NOT NULL DEFAULT 70,
  back_score NUMERIC NOT NULL DEFAULT 70,
  arms_score NUMERIC NOT NULL DEFAULT 70,
  core_score NUMERIC NOT NULL DEFAULT 70,
  legs_score NUMERIC NOT NULL DEFAULT 70,
  glutes_score NUMERIC NOT NULL DEFAULT 70,
  shoulders_score NUMERIC NOT NULL DEFAULT 70,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_scan_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own body scan results" 
ON public.body_scan_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own body scan results" 
ON public.body_scan_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body scan results" 
ON public.body_scan_results 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_body_scan_results_updated_at
BEFORE UPDATE ON public.body_scan_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add some sample data for testing
INSERT INTO public.body_scan_results (user_id, body_scan_id, chest_score, back_score, arms_score, core_score, legs_score, glutes_score, shoulders_score) 
VALUES 
('8589c22a-00f5-4e42-a197-fe0dbd87a5d8', 'b4cd0084-a421-45d1-8955-936161509d3a', 88, 75, 80, 60, 55, 65, 85);