-- Create the missing badge checking function
CREATE OR REPLACE FUNCTION public.check_and_award_all_badges(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  badge_record RECORD;
  awarded_badges jsonb := '[]'::jsonb;
  badge_info jsonb;
BEGIN
  -- Get user profile with current streaks
  SELECT * INTO user_profile 
  FROM user_profiles 
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "User profile not found"}'::jsonb;
  END IF;

  -- Check all badges
  FOR badge_record IN
    SELECT * FROM badges WHERE is_active = true
  LOOP
    -- Skip if badge already awarded
    IF EXISTS (
      SELECT 1 FROM user_badges 
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
          INSERT INTO user_badges (user_id, badge_id) 
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
              FROM nutrition_logs 
              WHERE user_id = target_user_id 
                AND EXTRACT(HOUR FROM created_at) < 9
                AND created_at >= CURRENT_DATE - INTERVAL '5 days') >= 5 THEN
            INSERT INTO user_badges (user_id, badge_id) 
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
  UPDATE user_profiles 
  SET total_badges_earned = (
    SELECT COUNT(*) FROM user_badges WHERE user_id = target_user_id
  )
  WHERE user_id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'awarded_badges', awarded_badges,
    'total_count', jsonb_array_length(awarded_badges)
  );
END;
$$;