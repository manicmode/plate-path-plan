-- Create monthly_rankings table for storing podium winners
CREATE TABLE IF NOT EXISTS public.monthly_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  final_score NUMERIC NOT NULL DEFAULT 0,
  final_streak INTEGER NOT NULL DEFAULT 0,
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL,
  podium_position INTEGER NOT NULL CHECK (podium_position >= 1 AND podium_position <= 3),
  total_interactions INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.monthly_rankings ENABLE ROW LEVEL SECURITY;

-- Create policies for monthly_rankings
CREATE POLICY "Anyone can view monthly rankings" 
ON public.monthly_rankings 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage monthly rankings" 
ON public.monthly_rankings 
FOR ALL 
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_month_year ON public.monthly_rankings(month_year);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_podium_position ON public.monthly_rankings(podium_position);