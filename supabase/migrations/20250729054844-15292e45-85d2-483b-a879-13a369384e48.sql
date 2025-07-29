-- Recreate recovery_logs table
CREATE TABLE IF NOT EXISTS public.recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recovery_type text NOT NULL CHECK (recovery_type IN ('meditation', 'breathing', 'yoga', 'cold', 'heat', 'sleep')),
  completed_at timestamp with time zone DEFAULT now(),
  duration_minutes integer,
  mood_before text,
  mood_after text,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recovery logs"
  ON public.recovery_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery logs"
  ON public.recovery_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);