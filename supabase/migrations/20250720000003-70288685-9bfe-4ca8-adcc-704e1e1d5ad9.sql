
-- PHASE 1: Data Cleanup and Core Tables
-- Clean up orphaned nutrition logs
UPDATE public.nutrition_logs 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'admin@example.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- Create daily_performance_scores table
CREATE TABLE public.daily_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  nutrition_score NUMERIC DEFAULT 0,
  hydration_score NUMERIC DEFAULT 0,
  supplement_score NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  meals_logged INTEGER DEFAULT 0,
  quality_average NUMERIC DEFAULT 0,
  streak_bonus NUMERIC DEFAULT 0,
  consistency_score NUMERIC DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_performance_scores
ALTER TABLE public.daily_performance_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_performance_scores
CREATE POLICY "Users can view their own performance scores" 
ON public.daily_performance_scores 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance scores" 
ON public.daily_performance_scores 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance scores" 
ON public.daily_performance_scores 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_daily_performance_scores_user_date ON public.daily_performance_scores(user_id, date);
CREATE INDEX idx_daily_performance_scores_total_score ON public.daily_performance_scores(total_score DESC);

-- PHASE 2: Badge System Functions
-- Create comprehensive badge checking function
CREATE OR REPLACE FUNCTION public.check_and_award_all_badges(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  awarded_badges jsonb := '[]'::jsonb;
  badge_info jsonb;
BEGIN
  -- Get user profile with current streaks
  SELECT * INTO user_profile 
  FROM public.user_profiles 
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "User profile not found"}'::jsonb;
  END IF;

  -- Check all badges
  FOR badge_record IN
    SELECT * FROM public.badges WHERE is_active = true
  LOOP
    -- Skip if badge already awarded
    IF EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      CONTINUE;
    END IF;

    -- Check badge requirements
    CASE badge_record.requirement_type
      WHEN 'streak' THEN
        IF (badge_record.tracker_type = 'hydration' AND user_profile.current_hydration_streak >= badge_record.requirement_value) OR
           (badge_record.tracker_type = 'nutrition' AND user_profile.current_nutrition_streak >= badge_record.requirement_value) OR
           (badge_record.tracker_type = 'supplements' AND user_profile.current_supplement_streak >= badge_record.requirement_value) OR
           (badge_record.tracker_type = 'any' AND GREATEST(
             COALESCE(user_profile.current_nutrition_streak, 0),
             COALESCE(user_profile.current_hydration_streak, 0),
             COALESCE(user_profile.current_supplement_streak, 0)
           ) >= badge_record.requirement_value) THEN
          -- Award badge
          INSERT INTO public.user_badges (user_id, badge_id) 
          VALUES (target_user_id, badge_record.id);
          
          badge_info := jsonb_build_object(
            'id', badge_record.id,
            'name', badge_record.name,
            'title', badge_record.title,
            'icon', badge_record.icon
          );
          awarded_badges := awarded_badges || badge_info;
        END IF;
        
      WHEN 'count' THEN
        -- Check various count-based requirements
        IF badge_record.name = 'early_riser' THEN
          -- Check breakfast logs before 9am in last 5 days
          IF (SELECT COUNT(DISTINCT DATE(created_at)) 
              FROM public.nutrition_logs 
              WHERE user_id = target_user_id 
                AND EXTRACT(HOUR FROM created_at) < 9
                AND created_at >= CURRENT_DATE - INTERVAL '5 days') >= 5 THEN
            INSERT INTO public.user_badges (user_id, badge_id) 
            VALUES (target_user_id, badge_record.id);
            
            badge_info := jsonb_build_object(
              'id', badge_record.id,
              'name', badge_record.name,
              'title', badge_record.title,
              'icon', badge_record.icon
            );
            awarded_badges := awarded_badges || badge_info;
          END IF;
        END IF;
        
      ELSE
        -- Default case for other requirement types
        CONTINUE;
    END CASE;
  END LOOP;

  -- Update total badges count
  UPDATE public.user_profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) FROM public.user_badges WHERE user_id = target_user_id
  )
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded_badges', awarded_badges,
    'total_count', jsonb_array_length(awarded_badges)
  );
END;
$$;

-- PHASE 3: Yearly Score System
-- Backfill yearly_score_preview table
INSERT INTO public.yearly_score_preview (
  user_id, year, yearly_score, monthly_trophies, avg_nutrition_streak, 
  avg_hydration_streak, avg_supplement_streak, total_active_days, 
  total_messages, rank_position, username, display_name
)
SELECT 
  user_id, year, yearly_score, monthly_trophies, avg_nutrition_streak,
  avg_hydration_streak, avg_supplement_streak, total_active_days,
  total_messages, rank_position, username, display_name
FROM public.get_top_100_yearly_users(2025)
ON CONFLICT (user_id, year) DO UPDATE SET
  yearly_score = EXCLUDED.yearly_score,
  monthly_trophies = EXCLUDED.monthly_trophies,
  avg_nutrition_streak = EXCLUDED.avg_nutrition_streak,
  avg_hydration_streak = EXCLUDED.avg_hydration_streak,
  avg_supplement_streak = EXCLUDED.avg_supplement_streak,
  total_active_days = EXCLUDED.total_active_days,
  total_messages = EXCLUDED.total_messages,
  rank_position = EXCLUDED.rank_position,
  last_updated = now();

-- PHASE 4: Security and Performance Fixes
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, selected_trackers)
  VALUES (NEW.id, ARRAY['calories', 'hydration', 'supplements']);
  RETURN NEW;
END;
$$;

-- Update user streak calculation function with better security
CREATE OR REPLACE FUNCTION public.update_user_streaks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  today_date date := CURRENT_DATE;
  streak_count integer := 0;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM user_profiles WHERE user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Handle nutrition logging streaks
  IF TG_TABLE_NAME = 'nutrition_logs' THEN
    -- Calculate current nutrition streak
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM nutrition_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (CURRENT_DATE - INTERVAL '60 days');
    
    -- Update user profile with nutrition streak
    UPDATE user_profiles 
    SET 
      current_nutrition_streak = streak_count,
      longest_nutrition_streak = GREATEST(COALESCE(longest_nutrition_streak, 0), streak_count),
      last_nutrition_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  -- Handle hydration logging streaks  
  IF TG_TABLE_NAME = 'hydration_logs' THEN
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM hydration_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (CURRENT_DATE - INTERVAL '60 days');
    
    UPDATE user_profiles 
    SET 
      current_hydration_streak = streak_count,
      longest_hydration_streak = GREATEST(COALESCE(longest_hydration_streak, 0), streak_count),
      last_hydration_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  -- Handle supplement logging streaks
  IF TG_TABLE_NAME = 'supplement_logs' THEN
    SELECT COUNT(DISTINCT DATE(created_at)) INTO streak_count
    FROM supplement_logs 
    WHERE user_id = NEW.user_id 
    AND created_at >= (CURRENT_DATE - INTERVAL '60 days');
    
    UPDATE user_profiles 
    SET 
      current_supplement_streak = streak_count,
      longest_supplement_streak = GREATEST(COALESCE(longest_supplement_streak, 0), streak_count),
      last_supplement_log_date = today_date
    WHERE user_id = NEW.user_id;
  END IF;

  -- Auto-check badges after streak update
  PERFORM check_and_award_all_badges(NEW.user_id);

  RETURN NEW;
END;
$$;

-- PHASE 5: Final Data Population and Validation
-- Award initial badges to existing users
DO $$
DECLARE
  user_record RECORD;
  badge_result jsonb;
BEGIN
  FOR user_record IN
    SELECT DISTINCT user_id FROM user_profiles
  LOOP
    SELECT check_and_award_all_badges(user_record.user_id) INTO badge_result;
    RAISE NOTICE 'Processed badges for user %: %', user_record.user_id, badge_result;
  END LOOP;
END;
$$;

-- Create performance tracking for daily scores
INSERT INTO public.daily_performance_scores (
  user_id, date, nutrition_score, hydration_score, supplement_score, 
  total_score, meals_logged, streak_bonus
)
SELECT 
  up.user_id,
  CURRENT_DATE,
  COALESCE(up.current_nutrition_streak * 5, 0) as nutrition_score,
  COALESCE(up.current_hydration_streak * 3, 0) as hydration_score,
  COALESCE(up.current_supplement_streak * 2, 0) as supplement_score,
  COALESCE(up.current_nutrition_streak * 5, 0) + 
  COALESCE(up.current_hydration_streak * 3, 0) + 
  COALESCE(up.current_supplement_streak * 2, 0) as total_score,
  (SELECT COUNT(*) FROM nutrition_logs WHERE user_id = up.user_id AND DATE(created_at) = CURRENT_DATE),
  GREATEST(
    COALESCE(up.current_nutrition_streak, 0),
    COALESCE(up.current_hydration_streak, 0),
    COALESCE(up.current_supplement_streak, 0)
  ) as streak_bonus
FROM user_profiles up
ON CONFLICT (user_id, date) DO UPDATE SET
  nutrition_score = EXCLUDED.nutrition_score,
  hydration_score = EXCLUDED.hydration_score,
  supplement_score = EXCLUDED.supplement_score,
  total_score = EXCLUDED.total_score,
  meals_logged = EXCLUDED.meals_logged,
  streak_bonus = EXCLUDED.streak_bonus,
  calculated_at = now();

-- Final validation queries
-- Verify data integrity
SELECT 
  'nutrition_logs' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_ids
FROM nutrition_logs
UNION ALL
SELECT 
  'user_badges' as table_name,
  COUNT(*) as total_records,
  0 as null_user_ids
FROM user_badges
UNION ALL
SELECT 
  'yearly_score_preview' as table_name,
  COUNT(*) as total_records,
  0 as null_user_ids
FROM yearly_score_preview
UNION ALL
SELECT 
  'daily_performance_scores' as table_name,
  COUNT(*) as total_records,
  0 as null_user_ids
FROM daily_performance_scores;
