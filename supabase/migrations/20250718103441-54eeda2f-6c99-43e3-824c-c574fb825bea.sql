-- Create badges table to define all available badges
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  requirement_type text NOT NULL, -- 'streak', 'count', 'daily_goal', etc.
  requirement_value integer NOT NULL,
  requirement_duration integer, -- days required for streak badges
  tracker_type text, -- 'hydration', 'nutrition', 'supplements', etc.
  rarity text NOT NULL DEFAULT 'common', -- 'common', 'rare', 'legendary'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_badges table to track unlocked badges per user
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS on badges table
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_badges table  
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies for badges table (public read access)
CREATE POLICY "Anyone can view badges"
ON public.badges
FOR SELECT
USING (true);

-- Create policies for user_badges table
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert predefined badges
INSERT INTO public.badges (name, title, description, icon, requirement_type, requirement_value, requirement_duration, tracker_type, rarity) VALUES
('hydration_hero', 'Hydration Hero 💧', 'Logged water intake for 7 days in a row', '💧', 'streak', 7, 7, 'hydration', 'common'),
('green_machine', 'Green Machine 🥬', 'Logged vegetables for 10 days in a row', '🥬', 'streak', 10, 10, 'nutrition', 'common'),
('streak_beast', 'Streak Beast 🐉', 'Logged any meals for 14 days in a row', '🐉', 'streak', 14, 14, 'nutrition', 'rare'),
('early_riser', 'Early Riser ☀️', 'Logged breakfast before 9am for 5 days', '☀️', 'early_meal', 5, 5, 'nutrition', 'common'),
('consistent_one', 'The Consistent One 🧘‍♂️', 'Logged meals daily for 30 days', '🧘‍♂️', 'streak', 30, 30, 'nutrition', 'rare'),
('protein_pro', 'Protein Pro 💪', 'Met protein goals for 5 days in a row', '💪', 'goal_streak', 5, 5, 'nutrition', 'common'),
('snack_samurai', 'Snack Samurai 🍎', 'Logged snacks for 10 days in a row', '🍎', 'snack_streak', 10, 10, 'nutrition', 'common'),
('logging_legend', 'Logging Legend 📆', 'Logged something every day for 60 days', '📆', 'streak', 60, 60, 'any', 'legendary'),
('supplement_specialist', 'Supplement Specialist 💊', 'Logged supplements for 7 days in a row', '💊', 'streak', 7, 7, 'supplements', 'common'),
('weekend_warrior', 'Weekend Warrior 🏃‍♂️', 'Logged meals on weekends for 4 weeks', '🏃‍♂️', 'weekend_streak', 4, 28, 'nutrition', 'rare');

-- Add streak tracking columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN current_nutrition_streak integer DEFAULT 0,
ADD COLUMN current_hydration_streak integer DEFAULT 0,
ADD COLUMN current_supplement_streak integer DEFAULT 0,
ADD COLUMN longest_nutrition_streak integer DEFAULT 0,
ADD COLUMN longest_hydration_streak integer DEFAULT 0,
ADD COLUMN longest_supplement_streak integer DEFAULT 0,
ADD COLUMN last_nutrition_log_date date,
ADD COLUMN last_hydration_log_date date,
ADD COLUMN last_supplement_log_date date,
ADD COLUMN selected_badge_title text,
ADD COLUMN total_badges_earned integer DEFAULT 0;

-- Create function to update user streaks
CREATE OR REPLACE FUNCTION public.update_user_streaks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  today_date date := CURRENT_DATE;
  streak_count integer := 0;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM public.user_profiles WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Handle nutrition logging streaks
  IF TG_TABLE_NAME = 'nutrition_logs' THEN
    -- Calculate current nutrition streak
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM public.nutrition_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (
      SELECT GREATEST(
        CURRENT_DATE - INTERVAL '60 days',
        COALESCE(
          (SELECT DATE(created_at) 
           FROM public.nutrition_logs 
           WHERE user_id = NEW.user_id 
           AND DATE(created_at) < CURRENT_DATE
           ORDER BY created_at DESC 
           LIMIT 1), 
          CURRENT_DATE - INTERVAL '1 day'
        )
      )
    );
    
    -- Update user profile with nutrition streak
    UPDATE public.user_profiles 
    SET 
      current_nutrition_streak = streak_count,
      longest_nutrition_streak = GREATEST(COALESCE(longest_nutrition_streak, 0), streak_count),
      last_nutrition_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  -- Handle hydration logging streaks  
  IF TG_TABLE_NAME = 'hydration_logs' THEN
    -- Calculate current hydration streak
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM public.hydration_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (
      SELECT GREATEST(
        CURRENT_DATE - INTERVAL '60 days',
        COALESCE(
          (SELECT DATE(created_at) 
           FROM public.hydration_logs 
           WHERE user_id = NEW.user_id 
           AND DATE(created_at) < CURRENT_DATE
           ORDER BY created_at DESC 
           LIMIT 1), 
          CURRENT_DATE - INTERVAL '1 day'
        )
      )
    );
    
    -- Update user profile with hydration streak
    UPDATE public.user_profiles 
    SET 
      current_hydration_streak = streak_count,
      longest_hydration_streak = GREATEST(COALESCE(longest_hydration_streak, 0), streak_count),
      last_hydration_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  -- Handle supplement logging streaks
  IF TG_TABLE_NAME = 'supplement_logs' THEN
    -- Calculate current supplement streak
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM public.supplement_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (
      SELECT GREATEST(
        CURRENT_DATE - INTERVAL '60 days',
        COALESCE(
          (SELECT DATE(created_at) 
           FROM public.supplement_logs 
           WHERE user_id = NEW.user_id 
           AND DATE(created_at) < CURRENT_DATE
           ORDER BY created_at DESC 
           LIMIT 1), 
          CURRENT_DATE - INTERVAL '1 day'
        )
      )
    );
    
    -- Update user profile with supplement streak
    UPDATE public.user_profiles 
    SET 
      current_supplement_streak = streak_count,
      longest_supplement_streak = GREATEST(COALESCE(longest_supplement_streak, 0), streak_count),
      last_supplement_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers to automatically update streaks
CREATE TRIGGER update_nutrition_streaks
  AFTER INSERT ON public.nutrition_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streaks();

CREATE TRIGGER update_hydration_streaks
  AFTER INSERT ON public.hydration_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streaks();

CREATE TRIGGER update_supplement_streaks
  AFTER INSERT ON public.supplement_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streaks();