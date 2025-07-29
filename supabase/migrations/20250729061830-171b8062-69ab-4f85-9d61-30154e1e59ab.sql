-- Recreate meditation_streaks table
CREATE TABLE IF NOT EXISTS public.meditation_streaks (
  user_id uuid PRIMARY KEY,
  total_sessions integer DEFAULT 0,
  current_streak integer DEFAULT 0,
  last_completed_date date,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meditation_streaks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own meditation streaks"
  ON public.meditation_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their meditation streaks"
  ON public.meditation_streaks FOR INSERT, UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);