-- Create weekly_summaries table
CREATE TABLE public.weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  average_score NUMERIC,
  previous_week_average NUMERIC,
  meals_logged_count INTEGER DEFAULT 0,
  days_with_meals INTEGER DEFAULT 0,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own weekly summaries" 
ON public.weekly_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly summaries" 
ON public.weekly_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_weekly_summaries_user_id ON public.weekly_summaries(user_id);
CREATE INDEX idx_weekly_summaries_week_start ON public.weekly_summaries(week_start);
CREATE UNIQUE INDEX idx_weekly_summaries_user_week ON public.weekly_summaries(user_id, week_start);