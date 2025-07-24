-- Fix the remaining database functions with mutable search paths

CREATE OR REPLACE FUNCTION public.calculate_next_trigger(reminder_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.batch_load_nutrition_data(user_id_param uuid, date_param date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_smart_friend_recommendations(current_user_id uuid)
 RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, friend_phone text, relevance_score numeric, interaction_metadata jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_private_challenge_status()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
$function$;