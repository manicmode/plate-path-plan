-- Create ai_nudges table
CREATE TABLE public.ai_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nudge_type text NOT NULL CHECK (nudge_type IN ('meditation', 'hydration', 'nutrition', 'exercise', 'sleep', 'breathing', 'yoga', 'recovery', 'mood')),
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_nudges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own AI nudges"
  ON public.ai_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI nudges"
  ON public.ai_nudges FOR INSERT
  WITH CHECK (auth.uid() = user_id);