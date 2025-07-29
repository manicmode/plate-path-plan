-- Recreate report_view_logs table
CREATE TABLE IF NOT EXISTS public.report_view_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'yearly')),
  report_date date NOT NULL,
  viewed_at timestamp with time zone DEFAULT now(),
  device_type text,
  interaction_type text CHECK (interaction_type IN ('viewed', 'shared', 'exported'))
);

-- Enable RLS
ALTER TABLE public.report_view_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own view logs"
  ON public.report_view_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own view logs"
  ON public.report_view_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);