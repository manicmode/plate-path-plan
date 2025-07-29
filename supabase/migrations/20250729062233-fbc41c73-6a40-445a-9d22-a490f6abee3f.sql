-- Drop existing meditation_nudge_preferences table and recreate with new structure
DROP TABLE IF EXISTS public.meditation_nudge_preferences CASCADE;

-- Recreate meditation_nudge_preferences table
CREATE TABLE public.meditation_nudge_preferences (
  user_id uuid PRIMARY KEY,
  allow_push boolean DEFAULT true,
  allow_ai_suggestions boolean DEFAULT true,
  allow_recovery_triggers boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meditation_nudge_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own nudge preferences"
  ON public.meditation_nudge_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their nudge preferences"
  ON public.meditation_nudge_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their nudge preferences"
  ON public.meditation_nudge_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);