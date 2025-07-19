
-- Fix function search path security warnings
-- This addresses the "Function Search Path Mutable" warnings in Supabase Security Advisor

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

-- Fix update_user_streaks function
CREATE OR REPLACE FUNCTION public.update_user_streaks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix calculate_next_trigger function
CREATE OR REPLACE FUNCTION public.calculate_next_trigger(reminder_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Fix update_reminder_next_trigger function
CREATE OR REPLACE FUNCTION public.update_reminder_next_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.next_trigger_at := public.calculate_next_trigger(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

-- Fix find_user_friends function
CREATE OR REPLACE FUNCTION public.find_user_friends(contact_hashes text[])
 RETURNS TABLE(user_id uuid, email text, phone text, contact_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix search_users_by_username_email function
CREATE OR REPLACE FUNCTION public.search_users_by_username_email(search_term text)
 RETURNS TABLE(user_id uuid, username text, email text, display_name text, first_name text, last_name text, current_nutrition_streak integer, current_hydration_streak integer, current_supplement_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix get_mutual_friends function
CREATE OR REPLACE FUNCTION public.get_mutual_friends(current_user_id uuid)
 RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, friend_phone text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix add_friend_from_contact function
CREATE OR REPLACE FUNCTION public.add_friend_from_contact(contact_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix get_pending_friend_requests function
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
 RETURNS TABLE(request_id uuid, requester_id uuid, requested_id uuid, requester_name text, requested_name text, requester_email text, requested_email text, created_at timestamp with time zone, status text, direction text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix send_friend_request function
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix update_follow_counts function
CREATE OR REPLACE FUNCTION public.update_follow_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
