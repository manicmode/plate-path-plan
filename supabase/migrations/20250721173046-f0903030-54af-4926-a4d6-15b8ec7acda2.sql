-- Create table to store generated monthly reports
CREATE TABLE public.monthly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_start_date DATE NOT NULL,
  month_end_date DATE NOT NULL,
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  summary_text TEXT,
  overall_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_start_date)
);

-- Create table to store generated yearly reports
CREATE TABLE public.yearly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year_start_date DATE NOT NULL,
  year_end_date DATE NOT NULL,
  title TEXT NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  summary_text TEXT,
  overall_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year_start_date)
);

-- Enable Row Level Security for monthly reports
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly reports
CREATE POLICY "Users can view their own monthly reports" 
ON public.monthly_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create monthly reports" 
ON public.monthly_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update monthly reports" 
ON public.monthly_reports 
FOR UPDATE 
USING (true);

-- Enable Row Level Security for yearly reports
ALTER TABLE public.yearly_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for yearly reports
CREATE POLICY "Users can view their own yearly reports" 
ON public.yearly_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create yearly reports" 
ON public.yearly_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update yearly reports" 
ON public.yearly_reports 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_monthly_reports_user_date ON public.monthly_reports(user_id, month_start_date DESC);
CREATE INDEX idx_monthly_reports_created_at ON public.monthly_reports(created_at DESC);
CREATE INDEX idx_yearly_reports_user_date ON public.yearly_reports(user_id, year_start_date DESC);
CREATE INDEX idx_yearly_reports_created_at ON public.yearly_reports(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_monthly_reports_updated_at
BEFORE UPDATE ON public.monthly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_yearly_reports_updated_at
BEFORE UPDATE ON public.yearly_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();