-- Fix all Function Search Path Mutable warnings by adding SET search_path = pg_catalog
-- This migration updates 33 functions to use locked search paths for security

-- 1. handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, selected_trackers)
  VALUES (NEW.id, ARRAY['calories', 'hydration', 'supplements']);
  RETURN NEW;
END;
$$;

-- 2. update_user_streaks
CREATE OR REPLACE FUNCTION public.update_user_streaks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
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

-- 3. find_user_friends
CREATE OR REPLACE FUNCTION public.find_user_friends(contact_hashes text[])
RETURNS TABLE(user_id uuid, email text, phone text, contact_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    au.email,
    up.phone,
    unnest(contact_hashes) as contact_hash
  FROM auth.users au
  JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    encode(digest(COALESCE(au.email, ''), 'sha256'), 'hex') = ANY(contact_hashes)
    OR encode(digest(COALESCE(up.phone, ''), 'sha256'), 'hex') = ANY(contact_hashes);
END;
$$;

-- 4. calculate_next_trigger
CREATE OR REPLACE FUNCTION public.calculate_next_trigger(reminder_id uuid)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  reminder_record RECORD;
  next_trigger TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := now();
  target_time TIME;
  target_date DATE;
  day_of_week INTEGER;
BEGIN
  -- Get reminder details
  SELECT * INTO reminder_record 
  FROM public.reminders 
  WHERE id = reminder_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  target_time := reminder_record.reminder_time;
  target_date := current_time::DATE;
  
  -- Calculate next trigger based on frequency type
  CASE reminder_record.frequency_type
    WHEN 'daily' THEN
      -- If today's time has passed, schedule for tomorrow
      IF (target_date + target_time) <= current_time THEN
        target_date := target_date + INTERVAL '1 day';
      END IF;
      next_trigger := target_date + target_time;
      
    WHEN 'every_x_days' THEN
      -- Calculate based on last triggered date or creation date
      IF reminder_record.last_triggered_at IS NOT NULL THEN
        target_date := (reminder_record.last_triggered_at::DATE) + (reminder_record.frequency_value || ' days')::INTERVAL;
      ELSE
        target_date := reminder_record.created_at::DATE;
      END IF;
      
      -- If calculated date is in the past, move to next occurrence
      WHILE (target_date + target_time) <= current_time LOOP
        target_date := target_date + (reminder_record.frequency_value || ' days')::INTERVAL;
      END LOOP;
      
      next_trigger := target_date + target_time;
      
    WHEN 'weekly', 'custom_days' THEN
      -- Find next occurrence of specified days
      day_of_week := EXTRACT(DOW FROM current_time); -- 0=Sunday, 1=Monday, etc.
      
      -- Find the next valid day
      FOR i IN 0..13 LOOP -- Check up to 2 weeks ahead
        target_date := (current_time + (i || ' days')::INTERVAL)::DATE;
        day_of_week := EXTRACT(DOW FROM target_date);
        
        -- Check if this day is in the custom_days array
        IF day_of_week = ANY(reminder_record.custom_days) THEN
          -- If it's today, check if time hasn't passed yet
          IF i = 0 AND (target_date + target_time) <= current_time THEN
            CONTINUE; -- Skip today, look for next occurrence
          END IF;
          
          next_trigger := target_date + target_time;
          EXIT;
        END IF;
      END LOOP;
      
    ELSE
      -- Default to daily
      next_trigger := target_date + target_time;
  END CASE;
  
  RETURN next_trigger;
END;
$$;

-- 5. search_users_by_username_email
CREATE OR REPLACE FUNCTION public.search_users_by_username_email(search_term text)
RETURNS TABLE(user_id uuid, username text, email text, display_name text, first_name text, last_name text, current_nutrition_streak integer, current_hydration_streak integer, current_supplement_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    COALESCE(up.first_name || ' ' || up.last_name, au.email) as username,
    au.email,
    COALESCE(up.first_name || ' ' || up.last_name, au.email) as display_name,
    up.first_name,
    up.last_name,
    COALESCE(up.current_nutrition_streak, 0) as current_nutrition_streak,
    COALESCE(up.current_hydration_streak, 0) as current_hydration_streak,
    COALESCE(up.current_supplement_streak, 0) as current_supplement_streak
  FROM public.user_profiles up
  JOIN auth.users au ON up.user_id = au.id
  WHERE 
    up.user_id != auth.uid() -- Exclude current user
    AND (
      LOWER(COALESCE(up.first_name || ' ' || up.last_name, '')) ILIKE '%' || LOWER(search_term) || '%'
      OR LOWER(au.email) ILIKE '%' || LOWER(search_term) || '%'
    )
    -- Exclude users who are already friends or have pending requests
    AND NOT EXISTS (
      SELECT 1 FROM public.user_friends uf 
      WHERE (uf.user_id = auth.uid() AND uf.friend_id = up.user_id)
         OR (uf.user_id = up.user_id AND uf.friend_id = auth.uid())
    )
  ORDER BY 
    CASE 
      WHEN LOWER(COALESCE(up.first_name || ' ' || up.last_name, '')) ILIKE LOWER(search_term) || '%' THEN 1
      WHEN LOWER(au.email) ILIKE LOWER(search_term) || '%' THEN 2
      ELSE 3
    END,
    COALESCE(up.first_name || ' ' || up.last_name, au.email)
  LIMIT 20;
END;
$$;

-- 6. get_mutual_friends
CREATE OR REPLACE FUNCTION public.get_mutual_friends(current_user_id uuid)
RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, friend_phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id as friend_id,
    COALESCE(up.first_name || ' ' || up.last_name, au.email) as friend_name,
    au.email as friend_email,
    up.phone as friend_phone
  FROM public.user_friends uf1
  JOIN public.user_friends uf2 ON uf1.friend_id = uf2.user_id AND uf1.user_id = uf2.friend_id
  JOIN public.user_profiles up ON uf1.friend_id = up.user_id
  JOIN auth.users au ON up.user_id = au.id
  WHERE uf1.user_id = current_user_id 
    AND uf1.status = 'accepted' 
    AND uf2.status = 'accepted';
END;
$$;

-- 7. add_friend_from_contact
CREATE OR REPLACE FUNCTION public.add_friend_from_contact(contact_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM public.user_friends 
    WHERE (user_id = current_user_id AND friend_id = contact_user_id)
       OR (user_id = contact_user_id AND friend_id = current_user_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- Create bidirectional friendship
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES 
    (current_user_id, contact_user_id, 'accepted'),
    (contact_user_id, current_user_id, 'accepted');
    
  RETURN true;
END;
$$;

-- 8. get_pending_friend_requests
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
RETURNS TABLE(request_id uuid, requester_id uuid, requested_id uuid, requester_name text, requested_name text, requester_email text, requested_email text, created_at timestamp with time zone, status text, direction text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  -- Incoming requests (others sent to current user)
  SELECT 
    uf.id as request_id,
    uf.user_id as requester_id,
    uf.friend_id as requested_id,
    COALESCE(up1.first_name || ' ' || up1.last_name, au1.email) as requester_name,
    COALESCE(up2.first_name || ' ' || up2.last_name, au2.email) as requested_name,
    au1.email as requester_email,
    au2.email as requested_email,
    uf.created_at,
    uf.status,
    'incoming'::text as direction
  FROM public.user_friends uf
  JOIN public.user_profiles up1 ON uf.user_id = up1.user_id
  JOIN auth.users au1 ON up1.user_id = au1.id
  JOIN public.user_profiles up2 ON uf.friend_id = up2.user_id
  JOIN auth.users au2 ON up2.user_id = au2.id
  WHERE uf.friend_id = auth.uid() 
    AND uf.status = 'pending'
  
  UNION ALL
  
  -- Outgoing requests (current user sent to others)
  SELECT 
    uf.id as request_id,
    uf.user_id as requester_id,
    uf.friend_id as requested_id,
    COALESCE(up1.first_name || ' ' || up1.last_name, au1.email) as requester_name,
    COALESCE(up2.first_name || ' ' || up2.last_name, au2.email) as requested_name,
    au1.email as requester_email,
    au2.email as requested_email,
    uf.created_at,
    uf.status,
    'outgoing'::text as direction
  FROM public.user_friends uf
  JOIN public.user_profiles up1 ON uf.user_id = up1.user_id
  JOIN auth.users au1 ON up1.user_id = au1.id
  JOIN public.user_profiles up2 ON uf.friend_id = up2.user_id
  JOIN auth.users au2 ON up2.user_id = au2.id
  WHERE uf.user_id = auth.uid() 
    AND uf.status = 'pending'
  
  ORDER BY created_at DESC;
END;
$$;

-- 9. send_friend_request
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check if request already exists
  IF EXISTS (
    SELECT 1 FROM public.user_friends 
    WHERE (user_id = current_user_id AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = current_user_id)
  ) THEN
    RETURN false;
  END IF;
  
  -- Create friend request
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES (current_user_id, target_user_id, 'pending');
  
  RETURN true;
END;
$$;

-- 10. update_follow_counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for user
    UPDATE public.user_profiles 
    SET following_count = following_count + 1
    WHERE user_id = NEW.user_id;
    
    -- Increment followers count for followed user
    UPDATE public.user_profiles 
    SET followers_count = followers_count + 1
    WHERE user_id = NEW.followed_user_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for user
    UPDATE public.user_profiles 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.user_id;
    
    -- Decrement followers count for followed user
    UPDATE public.user_profiles 
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE user_id = OLD.followed_user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 11. get_follow_status
CREATE OR REPLACE FUNCTION public.get_follow_status(target_user_id uuid)
RETURNS TABLE(is_following boolean, is_followed_by boolean, followers_count integer, following_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = current_user_id AND followed_user_id = target_user_id
    ) as is_following,
    EXISTS(
      SELECT 1 FROM public.user_follows 
      WHERE user_id = target_user_id AND followed_user_id = current_user_id
    ) as is_followed_by,
    COALESCE(up.followers_count, 0) as followers_count,
    COALESCE(up.following_count, 0) as following_count
  FROM public.user_profiles up
  WHERE up.user_id = target_user_id;
END;
$$;

-- 12. check_social_badges
CREATE OR REPLACE FUNCTION public.check_social_badges(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  user_following_count integer;
  user_followers_count integer;
  badge_record RECORD;
BEGIN
  -- Get user's follow counts
  SELECT following_count, followers_count 
  INTO user_following_count, user_followers_count
  FROM public.user_profiles 
  WHERE user_id = target_user_id;
  
  -- Check Social Butterfly badge (following 10 users)
  IF user_following_count >= 10 THEN
    SELECT * INTO badge_record FROM public.badges WHERE name = 'social_butterfly';
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id) 
      VALUES (target_user_id, badge_record.id);
    END IF;
  END IF;
  
  -- Check Trend Starter badge (10 followers)
  IF user_followers_count >= 10 THEN
    SELECT * INTO badge_record FROM public.badges WHERE name = 'trend_starter';
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges 
      WHERE user_id = target_user_id AND badge_id = badge_record.id
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_id) 
      VALUES (target_user_id, badge_record.id);
    END IF;
  END IF;
END;
$$;

-- 13. trigger_social_badge_check
CREATE OR REPLACE FUNCTION public.trigger_social_badge_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Check badges for both users involved in the follow
    PERFORM public.check_social_badges(NEW.user_id);
    PERFORM public.check_social_badges(NEW.followed_user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 14. accept_friend_request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  requester_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Get the requester ID and verify this is for the current user
  SELECT user_id INTO requester_id 
  FROM public.user_friends 
  WHERE id = request_id 
    AND friend_id = current_user_id 
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update the original request
  UPDATE public.user_friends 
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create the reverse friendship
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES (current_user_id, requester_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  RETURN true;
END;
$$;

-- 15. reject_friend_request
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  -- Delete the friend request
  DELETE FROM public.user_friends 
  WHERE id = request_id 
    AND friend_id = auth.uid() 
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- 16. batch_load_nutrition_data
CREATE OR REPLACE FUNCTION public.batch_load_nutrition_data(user_id_param uuid, date_param date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  result jsonb;
  foods_data jsonb;
  hydration_data jsonb;
  supplements_data jsonb;
  targets_data jsonb;
BEGIN
  -- Get foods data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'food_name', food_name,
      'calories', calories,
      'protein', protein,
      'carbs', carbs,
      'fat', fat,
      'fiber', fiber,
      'sugar', sugar,
      'sodium', sodium,
      'quality_score', quality_score,
      'serving_size', serving_size,
      'source', source,
      'image_url', image_url,
      'quality_verdict', quality_verdict,
      'quality_reasons', quality_reasons,
      'processing_level', processing_level,
      'ingredient_analysis', ingredient_analysis,
      'confidence', confidence,
      'created_at', created_at
    )
  ) INTO foods_data
  FROM public.nutrition_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get hydration data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'name', name,
      'volume', volume,
      'type', type,
      'image_url', image_url,
      'created_at', created_at
    )
  ) INTO hydration_data
  FROM public.hydration_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get supplements data
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'name', name,
      'dosage', dosage,
      'unit', unit,
      'frequency', frequency,
      'image_url', image_url,
      'created_at', created_at
    )
  ) INTO supplements_data
  FROM public.supplement_logs
  WHERE user_id = user_id_param 
    AND DATE(created_at) = date_param;

  -- Get targets data
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'date', date,
    'calories', calories,
    'protein', protein,
    'carbs', carbs,
    'fat', fat,
    'fiber', fiber,
    'sugar', sugar,
    'sodium', sodium,
    'saturated_fat', saturated_fat,
    'hydration_ml', hydration_ml,
    'supplement_count', supplement_count,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO targets_data
  FROM public.daily_nutrition_targets
  WHERE user_id = user_id_param 
    AND date = date_param;

  -- Combine all data
  result := jsonb_build_object(
    'foods', COALESCE(foods_data, '[]'::jsonb),
    'hydration', COALESCE(hydration_data, '[]'::jsonb),
    'supplements', COALESCE(supplements_data, '[]'::jsonb),
    'targets', COALESCE(targets_data, 'null'::jsonb)
  );

  RETURN result;
END;
$$;

-- 17. get_smart_friend_recommendations
CREATE OR REPLACE FUNCTION public.get_smart_friend_recommendations(current_user_id uuid)
RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, friend_phone text, relevance_score numeric, interaction_metadata jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH friend_base AS (
    -- Get all mutual friends
    SELECT 
      up.user_id as friend_id,
      COALESCE(up.first_name || ' ' || up.last_name, au.email) as friend_name,
      au.email as friend_email,
      up.phone as friend_phone,
      up.current_nutrition_streak,
      up.current_hydration_streak,
      up.current_supplement_streak
    FROM public.user_friends uf1
    JOIN public.user_friends uf2 ON uf1.friend_id = uf2.user_id AND uf1.user_id = uf2.friend_id
    JOIN public.user_profiles up ON uf1.friend_id = up.user_id
    JOIN auth.users au ON up.user_id = au.id
    WHERE uf1.user_id = current_user_id 
      AND uf1.status = 'accepted' 
      AND uf2.status = 'accepted'
  ),
  user_streaks AS (
    -- Get current user's streaks for comparison
    SELECT 
      current_nutrition_streak,
      current_hydration_streak,
      current_supplement_streak
    FROM public.user_profiles 
    WHERE user_id = current_user_id
  ),
  chat_interactions AS (
    -- Count recent chat interactions (last 30 days)
    SELECT 
      CASE 
        WHEN user_id = current_user_id THEN 
          COALESCE(tagged_users[1], '00000000-0000-0000-0000-000000000000'::uuid)
        ELSE user_id 
      END as friend_id,
      COUNT(*) as chat_count,
      MAX(created_at) as last_interaction
    FROM public.challenge_messages cm
    WHERE (user_id = current_user_id AND tagged_users IS NOT NULL AND array_length(tagged_users, 1) > 0)
       OR (current_user_id = ANY(tagged_users))
       OR user_id IN (SELECT friend_id FROM friend_base)
    AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  ),
  follow_status AS (
    -- Check follow relationships
    SELECT 
      followed_user_id as friend_id,
      true as is_following,
      created_at as follow_date
    FROM public.user_follows 
    WHERE user_id = current_user_id
    UNION ALL
    SELECT 
      user_id as friend_id,
      true as is_followed_by,
      created_at as followed_date
    FROM public.user_follows 
    WHERE followed_user_id = current_user_id
  ),
  challenge_participation AS (
    -- Count shared challenge participation (last 60 days)
    SELECT 
      friend_id,
      COUNT(DISTINCT challenge_id) as shared_challenges
    FROM (
      SELECT DISTINCT 
        cm1.challenge_id,
        cm2.user_id as friend_id
      FROM public.challenge_messages cm1
      JOIN public.challenge_messages cm2 ON cm1.challenge_id = cm2.challenge_id
      WHERE cm1.user_id = current_user_id 
        AND cm2.user_id != current_user_id
        AND cm1.created_at >= NOW() - INTERVAL '60 days'
        AND cm2.created_at >= NOW() - INTERVAL '60 days'
    ) shared
    GROUP BY friend_id
  )
  SELECT 
    fb.friend_id,
    fb.friend_name,
    fb.friend_email,
    fb.friend_phone,
    -- Calculate relevance score (0-100)
    ROUND(
      -- Chat interaction score (0-30 points)
      LEAST(30, COALESCE(ci.chat_count, 0) * 3) +
      
      -- Follow relationship score (0-20 points)
      CASE 
        WHEN EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_following) THEN 15
        WHEN EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_followed_by) THEN 10
        ELSE 0
      END +
      
      -- Shared challenges score (0-25 points)
      LEAST(25, COALESCE(cp.shared_challenges, 0) * 5) +
      
      -- Streak proximity score (0-20 points)
      GREATEST(0, 20 - (
        ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) +
        ABS(COALESCE(fb.current_hydration_streak, 0) - COALESCE(us.current_hydration_streak, 0)) +
        ABS(COALESCE(fb.current_supplement_streak, 0) - COALESCE(us.current_supplement_streak, 0))
      ) / 3.0) +
      
      -- Recent activity bonus (0-5 points)
      CASE 
        WHEN ci.last_interaction >= NOW() - INTERVAL '7 days' THEN 5
        WHEN ci.last_interaction >= NOW() - INTERVAL '14 days' THEN 3
        WHEN ci.last_interaction >= NOW() - INTERVAL '30 days' THEN 1
        ELSE 0
      END,
      1
    ) as relevance_score,
    
    -- Metadata for UI display
    jsonb_build_object(
      'chat_count', COALESCE(ci.chat_count, 0),
      'shared_challenges', COALESCE(cp.shared_challenges, 0),
      'is_following', EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_following),
      'is_followed_by', EXISTS(SELECT 1 FROM follow_status fs WHERE fs.friend_id = fb.friend_id AND fs.is_followed_by),
      'last_interaction', ci.last_interaction,
      'streak_similarity', CASE 
        WHEN ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) <= 2 THEN 'high'
        WHEN ABS(COALESCE(fb.current_nutrition_streak, 0) - COALESCE(us.current_nutrition_streak, 0)) <= 5 THEN 'medium'
        ELSE 'low'
      END,
      'activity_status', CASE 
        WHEN ci.last_interaction >= NOW() - INTERVAL '7 days' THEN 'recently_active'
        WHEN ci.last_interaction >= NOW() - INTERVAL '14 days' THEN 'active'
        WHEN ci.last_interaction >= NOW() - INTERVAL '30 days' THEN 'somewhat_active'
        ELSE 'inactive'
      END
    ) as interaction_metadata
    
  FROM friend_base fb
  CROSS JOIN user_streaks us
  LEFT JOIN chat_interactions ci ON fb.friend_id = ci.friend_id
  LEFT JOIN challenge_participation cp ON fb.friend_id = cp.friend_id
  ORDER BY relevance_score DESC, fb.friend_name ASC;
END;
$$;

-- 18. get_potential_accountability_buddies
CREATE OR REPLACE FUNCTION public.get_potential_accountability_buddies(current_user_id uuid)
RETURNS TABLE(buddy_user_id uuid, buddy_name text, buddy_email text, challenge_name text, challenge_id text, completion_date timestamp with time zone, shared_ranking_group boolean, buddy_rank_position integer, current_user_rank_position integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH user_challenge_completions AS (
    -- Get recent challenge completions for current user (last 7 days)
    SELECT DISTINCT 
      cm.challenge_id,
      cm.challenge_id as challenge_name, -- Using challenge_id as name for now
      MAX(cm.created_at) as completion_date
    FROM public.challenge_messages cm
    WHERE cm.user_id = current_user_id
      AND cm.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY cm.challenge_id
    HAVING COUNT(DISTINCT DATE(cm.created_at)) >= 5 -- Completed at least 5 days
  ),
  other_users_completions AS (
    -- Get other users who completed the same challenges
    SELECT DISTINCT
      cm.user_id as buddy_id,
      cm.challenge_id,
      cm.username as buddy_username,
      MAX(cm.created_at) as buddy_completion_date
    FROM public.challenge_messages cm
    INNER JOIN user_challenge_completions ucc ON cm.challenge_id = ucc.challenge_id
    WHERE cm.user_id != current_user_id
      AND cm.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY cm.user_id, cm.challenge_id, cm.username
    HAVING COUNT(DISTINCT DATE(cm.created_at)) >= 5 -- They also completed at least 5 days
  ),
  user_rankings AS (
    -- Get current user's rank in yearly scores
    SELECT rank_position as current_rank
    FROM public.yearly_score_preview
    WHERE user_id = current_user_id
    ORDER BY last_updated DESC
    LIMIT 1
  ),
  buddy_rankings AS (
    -- Get buddy rankings
    SELECT 
      ouc.buddy_id,
      ysp.rank_position as buddy_rank
    FROM other_users_completions ouc
    LEFT JOIN public.yearly_score_preview ysp ON ouc.buddy_id = ysp.user_id
  )
  SELECT DISTINCT
    ouc.buddy_id as buddy_user_id,
    COALESCE(up.first_name || ' ' || up.last_name, ouc.buddy_username) as buddy_name,
    au.email as buddy_email,
    ouc.challenge_id as challenge_name,
    ouc.challenge_id,
    GREATEST(ucc.completion_date, ouc.buddy_completion_date) as completion_date,
    -- Consider same ranking group if within 50 positions of each other
    CASE 
      WHEN ABS(COALESCE(br.buddy_rank, 999) - COALESCE(ur.current_rank, 999)) <= 50 
      THEN true 
      ELSE false 
    END as shared_ranking_group,
    COALESCE(br.buddy_rank, 999) as buddy_rank_position,
    COALESCE(ur.current_rank, 999) as current_user_rank_position
  FROM other_users_completions ouc
  INNER JOIN user_challenge_completions ucc ON ouc.challenge_id = ucc.challenge_id
  CROSS JOIN user_rankings ur
  LEFT JOIN buddy_rankings br ON ouc.buddy_id = br.buddy_id
  LEFT JOIN public.user_profiles up ON ouc.buddy_id = up.user_id
  LEFT JOIN auth.users au ON ouc.buddy_id = au.id
  WHERE 
    -- Exclude users who are already friends
    NOT EXISTS (
      SELECT 1 FROM public.user_friends uf 
      WHERE (uf.user_id = current_user_id AND uf.friend_id = ouc.buddy_id)
         OR (uf.user_id = ouc.buddy_id AND uf.friend_id = current_user_id)
    )
    -- Only show recent completions (within last 3 days)
    AND GREATEST(ucc.completion_date, ouc.buddy_completion_date) >= NOW() - INTERVAL '3 days'
  ORDER BY 
    shared_ranking_group DESC,
    completion_date DESC,
    ABS(COALESCE(br.buddy_rank, 999) - COALESCE(ur.current_rank, 999)) ASC
  LIMIT 5;
END;
$$;

-- 19. record_team_up_prompt_action
CREATE OR REPLACE FUNCTION public.record_team_up_prompt_action(buddy_user_id_param uuid, challenge_id_param text, action_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.team_up_prompts_shown (user_id, buddy_user_id, challenge_id, action_taken)
  VALUES (auth.uid(), buddy_user_id_param, challenge_id_param, action_param)
  ON CONFLICT (user_id, buddy_user_id, challenge_id) 
  DO UPDATE SET action_taken = action_param, shown_at = now();
  
  RETURN true;
END;
$$;

-- 20. get_challenge_podium_winners
CREATE OR REPLACE FUNCTION public.get_challenge_podium_winners(challenge_id_param text, month_year date DEFAULT CURRENT_DATE)
RETURNS TABLE(user_id uuid, username text, display_name text, final_score numeric, final_streak integer, completion_date timestamp with time zone, podium_position integer, total_interactions integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH challenge_participants AS (
    -- Get all participants in the challenge with their performance metrics
    SELECT DISTINCT
      cm.user_id,
      cm.username,
      COUNT(DISTINCT cm.id) as total_messages,
      COUNT(DISTINCT DATE(cm.created_at)) as active_days,
      MAX(cm.created_at) as last_activity,
      -- Calculate a composite score based on activity and engagement
      (COUNT(DISTINCT cm.id) * 1.0) + 
      (COUNT(DISTINCT DATE(cm.created_at)) * 5.0) +
      (CASE WHEN MAX(cm.created_at) >= NOW() - INTERVAL '7 days' THEN 10.0 ELSE 0.0 END) as activity_score
    FROM public.challenge_messages cm
    WHERE cm.challenge_id = challenge_id_param
      AND DATE_TRUNC('month', cm.created_at) = DATE_TRUNC('month', month_year)
    GROUP BY cm.user_id, cm.username
  ),
  user_performance AS (
    -- Get user streaks and performance data
    SELECT 
      cp.user_id,
      cp.username,
      COALESCE(up.first_name || ' ' || up.last_name, cp.username) as display_name,
      cp.activity_score as final_score,
      COALESCE(
        GREATEST(
          up.current_nutrition_streak, 
          up.current_hydration_streak, 
          up.current_supplement_streak
        ), 0
      ) as streak_value,
      cp.last_activity as completion_date,
      cp.total_messages as total_interactions
    FROM challenge_participants cp
    LEFT JOIN public.user_profiles up ON cp.user_id = up.user_id
  ),
  ranked_performers AS (
    -- Rank performers by score and streak, with tie-breaking by earliest completion
    SELECT 
      *,
      ROW_NUMBER() OVER (
        ORDER BY 
          final_score DESC, 
          streak_value DESC, 
          completion_date ASC,
          total_interactions DESC
      ) as rank_position
    FROM user_performance
  )
  SELECT 
    rp.user_id,
    rp.username,
    rp.display_name,
    rp.final_score,
    rp.streak_value::integer as final_streak,
    rp.completion_date,
    rp.rank_position::integer as podium_position,
    rp.total_interactions::integer
  FROM ranked_performers rp
  WHERE rp.rank_position <= 3
  ORDER BY rp.rank_position;
END;
$$;

-- 21. get_completed_challenges_for_month
CREATE OR REPLACE FUNCTION public.get_completed_challenges_for_month(target_month date DEFAULT CURRENT_DATE)
RETURNS TABLE(challenge_id text, challenge_name text, participant_count bigint, completion_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH challenge_activity AS (
    SELECT 
      cm.challenge_id,
      COUNT(DISTINCT cm.user_id) as participant_count,
      MAX(cm.created_at) as last_activity,
      MIN(cm.created_at) as first_activity
    FROM public.challenge_messages cm
    WHERE DATE_TRUNC('month', cm.created_at) = DATE_TRUNC('month', target_month)
    GROUP BY cm.challenge_id
    HAVING COUNT(DISTINCT cm.user_id) >= 2 -- At least 2 participants for a valid challenge
  )
  SELECT 
    ca.challenge_id,
    ca.challenge_id as challenge_name, -- Using challenge_id as name for now
    ca.participant_count,
    ca.last_activity as completion_date
  FROM challenge_activity ca
  -- Only include challenges that had activity ending in the target month
  WHERE DATE_TRUNC('month', ca.last_activity) = DATE_TRUNC('month', target_month)
  ORDER BY ca.last_activity DESC;
END;
$$;

-- 22. auto_assign_teams
CREATE OR REPLACE FUNCTION public.auto_assign_teams(challenge_id_param uuid, team_size_param integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  participant_record RECORD;
  team_record RECORD;
  current_team_id UUID;
  team_member_count INTEGER := 0;
  teams_created INTEGER := 0;
  ranking_data JSONB;
BEGIN
  -- Get participants ordered by their ranking score
  FOR participant_record IN
    SELECT 
      pcp.user_id,
      pcp.id as participation_id,
      COALESCE(
        (ysp.yearly_score + 
         COALESCE(up.current_nutrition_streak, 0) * 5 + 
         COALESCE(up.current_hydration_streak, 0) * 3 +
         COALESCE(up.current_supplement_streak, 0) * 2), 0
      ) as ranking_score,
      COALESCE(up.first_name || ' ' || up.last_name, 'User') as user_name
    FROM public.private_challenge_participations pcp
    LEFT JOIN public.yearly_score_preview ysp ON pcp.user_id = ysp.user_id
    LEFT JOIN public.user_profiles up ON pcp.user_id = up.user_id
    WHERE pcp.private_challenge_id = challenge_id_param
      AND pcp.team_id IS NULL
    ORDER BY ranking_score DESC
  LOOP
    -- Create new team if needed
    IF team_member_count = 0 OR team_member_count >= team_size_param THEN
      teams_created := teams_created + 1;
      
      INSERT INTO public.challenge_teams (
        name,
        challenge_id,
        creator_id,
        member_ids
      ) VALUES (
        'Team ' || teams_created,
        challenge_id_param,
        participant_record.user_id,
        ARRAY[participant_record.user_id]
      ) RETURNING id INTO current_team_id;
      
      team_member_count := 1;
    ELSE
      -- Add to existing team
      UPDATE public.challenge_teams 
      SET member_ids = member_ids || participant_record.user_id,
          updated_at = now()
      WHERE id = current_team_id;
      
      team_member_count := team_member_count + 1;
    END IF;
    
    -- Update participation record with team assignment
    UPDATE public.private_challenge_participations
    SET team_id = current_team_id
    WHERE id = participant_record.participation_id;
  END LOOP;
  
  RETURN teams_created;
END;
$$;

-- 23. update_team_scores
CREATE OR REPLACE FUNCTION public.update_team_scores(challenge_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  team_record RECORD;
  team_score NUMERIC;
  team_progress NUMERIC;
BEGIN
  FOR team_record IN
    SELECT ct.id as team_id, ct.member_ids
    FROM public.challenge_teams ct
    WHERE ct.challenge_id = challenge_id_param
  LOOP
    -- Calculate team score as sum of member progress
    SELECT 
      COALESCE(SUM(pcp.progress_value), 0),
      COALESCE(AVG(pcp.completion_percentage), 0)
    INTO team_score, team_progress
    FROM public.private_challenge_participations pcp
    WHERE pcp.team_id = team_record.team_id;
    
    -- Update team scores
    UPDATE public.challenge_teams
    SET 
      current_score = team_score,
      total_progress = team_progress,
      updated_at = now()
    WHERE id = team_record.team_id;
  END LOOP;
  
  -- Update team rankings
  UPDATE public.challenge_teams ct
  SET team_rank = ranked.rank_position
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY current_score DESC, total_progress DESC, created_at ASC) as rank_position
    FROM public.challenge_teams
    WHERE challenge_id = challenge_id_param
  ) ranked
  WHERE ct.id = ranked.id;
END;
$$;

-- 24. get_top_100_yearly_users
CREATE OR REPLACE FUNCTION public.get_top_100_yearly_users(target_year integer DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer)
RETURNS TABLE(user_id uuid, username text, display_name text, yearly_score numeric, monthly_trophies integer, avg_nutrition_streak numeric, avg_hydration_streak numeric, avg_supplement_streak numeric, total_active_days integer, total_messages integer, rank_position integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH year_bounds AS (
    SELECT 
      (target_year || '-01-01')::DATE as year_start,
      (target_year || '-12-31')::DATE as year_end
  ),
  user_messages AS (
    -- Get total messages and active days from challenges
    SELECT 
      cm.user_id,
      cm.username,
      COUNT(*) as total_messages,
      COUNT(DISTINCT DATE(cm.created_at)) as message_active_days
    FROM public.challenge_messages cm
    CROSS JOIN year_bounds yb
    WHERE DATE(cm.created_at) BETWEEN yb.year_start AND yb.year_end
    GROUP BY cm.user_id, cm.username
  ),
  user_logging_activity AS (
    -- Get active days from nutrition, hydration, supplement logs
    SELECT 
      COALESCE(nl.user_id, hl.user_id, sl.user_id) as user_id,
      COUNT(DISTINCT COALESCE(DATE(nl.created_at), DATE(hl.created_at), DATE(sl.created_at))) as logging_active_days
    FROM year_bounds yb
    FULL OUTER JOIN public.nutrition_logs nl ON DATE(nl.created_at) BETWEEN yb.year_start AND yb.year_end
    FULL OUTER JOIN public.hydration_logs hl ON DATE(hl.created_at) BETWEEN yb.year_start AND yb.year_end
    FULL OUTER JOIN public.supplement_logs sl ON DATE(sl.created_at) BETWEEN yb.year_start AND yb.year_end
    WHERE COALESCE(nl.user_id, hl.user_id, sl.user_id) IS NOT NULL
    GROUP BY COALESCE(nl.user_id, hl.user_id, sl.user_id)
  ),
  monthly_winners AS (
    -- Get monthly 1st place finishes by checking each month
    SELECT 
      user_id,
      COUNT(*) as monthly_trophy_count
    FROM (
      SELECT DISTINCT
        DATE_TRUNC('month', generate_series(
          (target_year || '-01-01')::DATE,
          (target_year || '-12-31')::DATE,
          '1 month'::INTERVAL
        )) as month_start
    ) months
    CROSS JOIN LATERAL (
      -- For each month, get 1st place winners from completed challenges
      SELECT DISTINCT cp.user_id
      FROM public.get_completed_challenges_for_month(month_start::DATE) cc
      CROSS JOIN LATERAL public.get_challenge_podium_winners(cc.challenge_id, month_start::DATE) cp
      WHERE cp.podium_position = 1
    ) winners
    GROUP BY user_id
  ),
  user_profiles_data AS (
    -- Get current streak data and names from profiles
    SELECT 
      up.user_id,
      COALESCE(up.first_name || ' ' || up.last_name, au.email) as display_name,
      COALESCE(up.current_nutrition_streak, 0) as nutrition_streak,
      COALESCE(up.current_hydration_streak, 0) as hydration_streak,
      COALESCE(up.current_supplement_streak, 0) as supplement_streak
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
  ),
  user_yearly_stats AS (
    -- Combine all stats for each user
    SELECT 
      COALESCE(um.user_id, ula.user_id, upd.user_id) as user_id,
      COALESCE(um.username, upd.display_name, 'Unknown') as username,
      COALESCE(upd.display_name, um.username, 'Unknown') as display_name,
      COALESCE(um.total_messages, 0) as total_messages,
      GREATEST(
        COALESCE(um.message_active_days, 0),
        COALESCE(ula.logging_active_days, 0)
      ) as total_active_days,
      COALESCE(mw.monthly_trophy_count, 0) as monthly_trophies,
      COALESCE(upd.nutrition_streak, 0) as avg_nutrition_streak,
      COALESCE(upd.hydration_streak, 0) as avg_hydration_streak,
      COALESCE(upd.supplement_streak, 0) as avg_supplement_streak
    FROM user_messages um
    FULL OUTER JOIN user_logging_activity ula ON um.user_id = ula.user_id
    FULL OUTER JOIN monthly_winners mw ON COALESCE(um.user_id, ula.user_id) = mw.user_id
    FULL OUTER JOIN user_profiles_data upd ON COALESCE(um.user_id, ula.user_id) = upd.user_id
    WHERE COALESCE(um.user_id, ula.user_id, upd.user_id) IS NOT NULL
  ),
  scored_users AS (
    -- Calculate yearly scores and rank
    SELECT 
      *,
      -- Weighted formula: Messages * 1 + Active days * 2 + Monthly wins * 30 + Average streaks * 3
      (
        total_messages * 1.0 +
        total_active_days * 2.0 +
        monthly_trophies * 30.0 +
        ((avg_nutrition_streak + avg_hydration_streak + avg_supplement_streak) / 3.0) * 3.0
      ) as yearly_score
    FROM user_yearly_stats
  ),
  ranked_users AS (
    -- Rank users with tie-breaking
    SELECT 
      *,
      ROW_NUMBER() OVER (
        ORDER BY 
          yearly_score DESC,
          monthly_trophies DESC,
          GREATEST(avg_nutrition_streak, avg_hydration_streak, avg_supplement_streak) DESC,
          total_active_days DESC,
          total_messages DESC
      ) as rank_position
    FROM scored_users
  )
  SELECT 
    ru.user_id,
    ru.username,
    ru.display_name,
    ROUND(ru.yearly_score, 2) as yearly_score,
    ru.monthly_trophies,
    ROUND(ru.avg_nutrition_streak, 1) as avg_nutrition_streak,
    ROUND(ru.avg_hydration_streak, 1) as avg_hydration_streak,
    ROUND(ru.avg_supplement_streak, 1) as avg_supplement_streak,
    ru.total_active_days,
    ru.total_messages,
    ru.rank_position::INTEGER
  FROM ranked_users ru
  WHERE ru.rank_position <= 100
  ORDER BY ru.rank_position;
END;
$$;

-- 25. trigger_yearly_scores_preview_update
CREATE OR REPLACE FUNCTION public.trigger_yearly_scores_preview_update()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  response jsonb;
BEGIN
  SELECT net.http_post(
    url := 'https://uzoiiijqtahohfafqirm.supabase.co/functions/v1/update-yearly-scores-preview',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6b2lpaWpxdGFob2hmYWZxaXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTE2MzgsImV4cCI6MjA2Njk2NzYzOH0.Ny_Gxbhus7pNm0OHipRBfaFLNeK_ZSePfbj8no4SVGw"}'::jsonb,
    body := '{"manual_trigger": true, "timestamp": "' || now()::text || '"}'::jsonb
  ) INTO response;
  
  RETURN response;
END;
$$;

-- 26. update_challenge_participant_count
CREATE OR REPLACE FUNCTION public.update_challenge_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
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
$$;

-- 27. trigger_team_score_update
CREATE OR REPLACE FUNCTION public.trigger_team_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  challenge_id_var UUID;
BEGIN
  -- Get challenge_id from the participation record
  IF TG_OP = 'DELETE' THEN
    SELECT pc.id INTO challenge_id_var
    FROM public.private_challenges pc
    JOIN public.private_challenge_participations pcp ON pc.id = pcp.private_challenge_id
    WHERE pcp.id = OLD.id;
  ELSE
    SELECT pc.id INTO challenge_id_var
    FROM public.private_challenges pc
    JOIN public.private_challenge_participations pcp ON pc.id = pcp.private_challenge_id
    WHERE pcp.id = NEW.id;
  END IF;
  
  -- Update team scores if this is a team challenge
  IF challenge_id_var IS NOT NULL THEN
    PERFORM public.update_team_scores(challenge_id_var);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Note: Functions with existing search_path = '' setting are already secure:
-- 28. update_updated_at_column() - already has SET search_path = ''
-- 29. update_reminder_next_trigger() - already has SET search_path = ''

-- The remaining 3 functions need security-focused updates:

-- 30. get_user_private_challenge_access
CREATE OR REPLACE FUNCTION public.get_user_private_challenge_access(challenge_id_param UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = pg_catalog
AS $$
BEGIN
  -- Check if user is creator, invited, or participant
  RETURN EXISTS (
    SELECT 1 FROM public.private_challenges pc 
    WHERE pc.id = challenge_id_param 
    AND (
      pc.creator_id = auth.uid() OR 
      auth.uid() = ANY(pc.invited_user_ids)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.private_challenge_participations pcp
    WHERE pcp.private_challenge_id = challenge_id_param 
    AND pcp.user_id = auth.uid()
  );
END;
$$;

-- 31. update_private_challenge_status
CREATE OR REPLACE FUNCTION public.update_private_challenge_status()
RETURNS void 
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  -- Update challenges from pending to active when start_date is reached
  UPDATE public.private_challenges 
  SET status = 'active', updated_at = now()
  WHERE status = 'pending' 
    AND start_date <= CURRENT_DATE;
    
  -- Update challenges from active to completed when duration is over
  UPDATE public.private_challenges 
  SET status = 'completed', updated_at = now()
  WHERE status = 'active' 
    AND (start_date + INTERVAL '1 day' * duration_days) <= CURRENT_DATE;
END;
$$;

-- 32. check_and_award_all_badges
CREATE OR REPLACE FUNCTION public.check_and_award_all_badges(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = pg_catalog
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