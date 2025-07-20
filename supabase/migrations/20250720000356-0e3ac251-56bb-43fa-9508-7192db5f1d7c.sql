-- CRITICAL RECOVERY - Fix all issues now
-- Fix 1: Clean up NULL user_ids properly
UPDATE nutrition_logs 
SET user_id = '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid
WHERE user_id IS NULL;

-- Fix 2: Award badges to users with existing streaks
SELECT check_and_award_all_badges('8589c22a-00f5-4e42-a197-fe0dbd87a5d8'::uuid) as badge_result_user1;
SELECT check_and_award_all_badges('8c45e108-97ae-4111-a321-faeaf05580e5'::uuid) as badge_result_user2;

-- Fix 3: Populate yearly scores for 2025
INSERT INTO yearly_score_preview (
  user_id, year, yearly_score, monthly_trophies, avg_nutrition_streak,
  avg_hydration_streak, avg_supplement_streak, total_active_days,
  total_messages, rank_position, username, display_name
)
SELECT 
  user_id, 
  2025 as year,
  (COALESCE(current_nutrition_streak, 0) * 5 + 
   COALESCE(current_hydration_streak, 0) * 3 + 
   COALESCE(current_supplement_streak, 0) * 2) as yearly_score,
  0 as monthly_trophies,
  COALESCE(current_nutrition_streak, 0) as avg_nutrition_streak,
  COALESCE(current_hydration_streak, 0) as avg_hydration_streak,
  COALESCE(current_supplement_streak, 0) as avg_supplement_streak,
  1 as total_active_days,
  0 as total_messages,
  ROW_NUMBER() OVER (ORDER BY 
    (COALESCE(current_nutrition_streak, 0) * 5 + 
     COALESCE(current_hydration_streak, 0) * 3 + 
     COALESCE(current_supplement_streak, 0) * 2) DESC
  ) as rank_position,
  COALESCE(first_name || ' ' || last_name, 'User') as username,
  COALESCE(first_name || ' ' || last_name, 'User') as display_name
FROM user_profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, year) DO UPDATE SET
  yearly_score = EXCLUDED.yearly_score,
  rank_position = EXCLUDED.rank_position,
  last_updated = now();