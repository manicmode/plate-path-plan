-- Create yearly_score_preview table for real-time leaderboard updates
CREATE TABLE public.yearly_score_preview (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  yearly_score NUMERIC NOT NULL DEFAULT 0,
  monthly_trophies INTEGER NOT NULL DEFAULT 0,
  avg_nutrition_streak NUMERIC DEFAULT 0,
  avg_hydration_streak NUMERIC DEFAULT 0,
  avg_supplement_streak NUMERIC DEFAULT 0,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.yearly_score_preview ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view yearly score preview" 
ON public.yearly_score_preview 
FOR SELECT 
USING (true);

CREATE POLICY "System can update yearly score preview" 
ON public.yearly_score_preview 
FOR ALL
USING (true);

-- Add index for performance
CREATE INDEX idx_yearly_score_preview_year_rank ON public.yearly_score_preview(year, rank_position);
CREATE INDEX idx_yearly_score_preview_updated ON public.yearly_score_preview(last_updated);

-- Enable pg_cron and pg_net extensions for scheduled functions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;