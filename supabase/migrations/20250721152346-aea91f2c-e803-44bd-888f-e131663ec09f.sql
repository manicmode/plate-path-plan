-- Create table to store generated weekly reports
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  summary_text TEXT,
  overall_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own weekly reports" 
ON public.weekly_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create weekly reports" 
ON public.weekly_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update weekly reports" 
ON public.weekly_reports 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_weekly_reports_user_date ON public.weekly_reports(user_id, week_start_date DESC);
CREATE INDEX idx_weekly_reports_created_at ON public.weekly_reports(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_reports_updated_at
BEFORE UPDATE ON public.weekly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();