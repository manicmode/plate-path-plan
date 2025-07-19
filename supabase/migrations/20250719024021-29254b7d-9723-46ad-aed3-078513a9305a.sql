-- Create public challenges system
CREATE TABLE public.public_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_description TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'habit', -- 'habit', 'streak', 'target'
  difficulty_level TEXT NOT NULL DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  category TEXT NOT NULL, -- 'hydration', 'nutrition', 'exercise', 'mindfulness'
  target_metric TEXT, -- 'water_glasses', 'veggie_servings', 'steps', etc.
  target_value NUMERIC, -- target amount (e.g., 8 for 8 glasses)
  target_unit TEXT, -- 'glasses', 'servings', 'minutes'
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  is_trending BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_limited_time BOOLEAN NOT NULL DEFAULT false,
  limited_time_end TIMESTAMP WITH TIME ZONE,
  participant_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user challenge participations
CREATE TABLE public.user_challenge_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID REFERENCES public.public_challenges(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  current_progress NUMERIC NOT NULL DEFAULT 0,
  total_target NUMERIC NOT NULL,
  daily_completions JSONB NOT NULL DEFAULT '{}', -- {date: completion_status}
  streak_count INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_progress_update TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

-- Create challenge progress logs
CREATE TABLE public.challenge_progress_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participation_id UUID REFERENCES public.user_challenge_participations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.public_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_challenges
CREATE POLICY "Anyone can view public challenges" 
ON public.public_challenges 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Authenticated users can update participant count" 
ON public.public_challenges 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for user_challenge_participations
CREATE POLICY "Users can view their own participations" 
ON public.user_challenge_participations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own participations" 
ON public.user_challenge_participations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
ON public.user_challenge_participations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations" 
ON public.user_challenge_participations 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for challenge_progress_logs
CREATE POLICY "Users can view their own progress logs" 
ON public.challenge_progress_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress logs" 
ON public.challenge_progress_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress logs" 
ON public.challenge_progress_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_public_challenges_category ON public.public_challenges(category);
CREATE INDEX idx_public_challenges_trending ON public.public_challenges(is_trending) WHERE is_trending = true;
CREATE INDEX idx_user_participations_user_id ON public.user_challenge_participations(user_id);
CREATE INDEX idx_user_participations_challenge_id ON public.user_challenge_participations(challenge_id);
CREATE INDEX idx_progress_logs_participation_id ON public.challenge_progress_logs(participation_id);
CREATE INDEX idx_progress_logs_date ON public.challenge_progress_logs(log_date);

-- Function to update participant count
CREATE OR REPLACE FUNCTION public.update_challenge_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.public_challenges 
    SET participant_count = participant_count + 1,
        updated_at = now()
    WHERE id = NEW.challenge_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.public_challenges 
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = now()
    WHERE id = OLD.challenge_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update participant count
CREATE TRIGGER update_participant_count_trigger
AFTER INSERT OR DELETE ON public.user_challenge_participations
FOR EACH ROW EXECUTE FUNCTION public.update_challenge_participant_count();

-- Function to calculate challenge progress
CREATE OR REPLACE FUNCTION public.calculate_challenge_progress(participation_id_param UUID)
RETURNS void AS $$
DECLARE
  participation_record RECORD;
  total_days INTEGER;
  completed_days INTEGER;
  current_streak INTEGER := 0;
  best_streak INTEGER := 0;
  temp_streak INTEGER := 0;
  daily_data JSONB;
  completion_pct NUMERIC;
BEGIN
  -- Get participation details
  SELECT * INTO participation_record 
  FROM public.user_challenge_participations 
  WHERE id = participation_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculate total days and completed days
  total_days := participation_record.end_date - participation_record.start_date + 1;
  daily_data := participation_record.daily_completions;
  
  -- Count completed days and calculate streaks
  completed_days := 0;
  FOR i IN 0..(total_days-1) LOOP
    IF (daily_data->((participation_record.start_date + i)::TEXT))::BOOLEAN IS TRUE THEN
      completed_days := completed_days + 1;
      temp_streak := temp_streak + 1;
      best_streak := GREATEST(best_streak, temp_streak);
      IF participation_record.start_date + i = CURRENT_DATE - INTERVAL '1 day' OR 
         participation_record.start_date + i = CURRENT_DATE THEN
        current_streak := temp_streak;
      END IF;
    ELSE
      temp_streak := 0;
    END IF;
  END LOOP;
  
  -- Calculate completion percentage
  completion_pct := CASE 
    WHEN total_days > 0 THEN (completed_days::NUMERIC / total_days::NUMERIC) * 100
    ELSE 0 
  END;
  
  -- Update participation record
  UPDATE public.user_challenge_participations 
  SET 
    current_progress = completed_days,
    streak_count = current_streak,
    best_streak = best_streak,
    completion_percentage = completion_pct,
    is_completed = (completion_pct >= 100 OR CURRENT_DATE > end_date),
    completed_at = CASE WHEN completion_pct >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END,
    last_progress_update = now()
  WHERE id = participation_id_param;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample public challenges
INSERT INTO public.public_challenges (title, description, goal_description, duration_days, challenge_type, category, target_metric, target_value, target_unit, badge_icon, is_trending, is_new) VALUES
('💧 Hydration Hero', 'Build a healthy hydration habit', 'Drink 8 glasses of water daily for 30 days', 30, 'habit', 'hydration', 'water_glasses', 8, 'glasses', '💧', true, false),
('🥗 Veggie Champion', 'Increase your vegetable intake', 'Eat 5 servings of vegetables daily for 21 days', 21, 'habit', 'nutrition', 'veggie_servings', 5, 'servings', '🥗', false, true),
('🚶 Step Master', 'Get moving every day', 'Walk 10,000 steps daily for 14 days', 14, 'habit', 'exercise', 'steps', 10000, 'steps', '🚶', true, false),
('🧘 Mindful Moments', 'Practice daily mindfulness', 'Meditate for 10 minutes daily for 7 days', 7, 'habit', 'mindfulness', 'meditation_minutes', 10, 'minutes', '🧘', false, true),
('🍎 Fruit Fiesta', 'Add more fruits to your diet', 'Eat 3 servings of fruit daily for 14 days', 14, 'habit', 'nutrition', 'fruit_servings', 3, 'servings', '🍎', false, false),
('💪 Protein Power', 'Meet your protein goals', 'Consume 100g protein daily for 21 days', 21, 'target', 'nutrition', 'protein_grams', 100, 'grams', '💪', false, false),
('🌱 Green Smoothie', 'Quick healthy habit', 'Drink 1 green smoothie today', 1, 'habit', 'nutrition', 'green_smoothies', 1, 'smoothie', '🌱', false, true),
('🏃 Quick Sprint', 'Weekend warrior challenge', 'Complete a 20-minute workout for 3 days', 3, 'habit', 'exercise', 'workout_minutes', 20, 'minutes', '🏃', false, false);