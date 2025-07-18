-- Create monthly_summaries table
CREATE TABLE public.monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month_start DATE NOT NULL,
  average_score NUMERIC,
  previous_month_average NUMERIC,
  meals_logged_count INTEGER DEFAULT 0,
  days_with_meals INTEGER DEFAULT 0,
  message TEXT NOT NULL,
  ranking_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.monthly_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own monthly summaries" 
ON public.monthly_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly summaries" 
ON public.monthly_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_monthly_summaries_user_id ON public.monthly_summaries(user_id);
CREATE INDEX idx_monthly_summaries_month_start ON public.monthly_summaries(month_start);

-- Create unique constraint on user_id and month_start
CREATE UNIQUE INDEX idx_monthly_summaries_user_month ON public.monthly_summaries(user_id, month_start);