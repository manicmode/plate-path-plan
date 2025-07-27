-- Create meditation_nudge_preferences table
CREATE TABLE IF NOT EXISTS public.meditation_nudge_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  smart_nudges_enabled BOOLEAN NOT NULL DEFAULT true,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create meditation_nudge_history table to track user behavior
CREATE TABLE IF NOT EXISTS public.meditation_nudge_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL, -- 'ai_coach', 'daily_reminder', 'smart_nudge'
  nudge_reason TEXT, -- 'low_mood', 'skipped_meditation', 'intense_exercise', 'scheduled'
  user_action TEXT NOT NULL, -- 'accepted', 'dismissed', 'ignored'
  nudge_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meditation_user_scores table for internal scoring
CREATE TABLE IF NOT EXISTS public.meditation_user_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_acceptance_rate NUMERIC DEFAULT 0,
  total_nudges_received INTEGER DEFAULT 0,
  total_nudges_accepted INTEGER DEFAULT 0,
  average_meditation_time TEXT, -- time of day they usually meditate
  streak_score NUMERIC DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.meditation_nudge_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_nudge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_user_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for meditation_nudge_preferences
CREATE POLICY "Users can view their own nudge preferences" 
ON public.meditation_nudge_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nudge preferences" 
ON public.meditation_nudge_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nudge preferences" 
ON public.meditation_nudge_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for meditation_nudge_history
CREATE POLICY "Users can view their own nudge history" 
ON public.meditation_nudge_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create nudge history" 
ON public.meditation_nudge_history 
FOR INSERT 
WITH CHECK (true);

-- RLS policies for meditation_user_scores
CREATE POLICY "Users can view their own scores" 
ON public.meditation_user_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage user scores" 
ON public.meditation_user_scores 
FOR ALL 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_meditation_nudge_preferences_updated_at
BEFORE UPDATE ON public.meditation_nudge_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meditation_user_scores_updated_at
BEFORE UPDATE ON public.meditation_user_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();