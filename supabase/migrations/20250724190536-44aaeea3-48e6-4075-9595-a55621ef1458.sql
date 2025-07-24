-- Fix all remaining database functions with mutable search paths

CREATE OR REPLACE FUNCTION public.update_reminder_next_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.next_trigger_at := public.calculate_next_trigger(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (user_id, selected_trackers)
  VALUES (NEW.id, ARRAY['calories', 'hydration', 'supplements']);
  
  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_streaks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.find_user_friends(contact_hashes text[])
 RETURNS TABLE(user_id uuid, email text, phone text, contact_hash text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.get_mutual_friends(current_user_id uuid)
 RETURNS TABLE(friend_id uuid, friend_name text, friend_email text, friend_phone text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.add_friend_from_contact(contact_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
 RETURNS TABLE(request_id uuid, requester_id uuid, requested_id uuid, requester_name text, requested_name text, requester_email text, requested_email text, created_at timestamp with time zone, status text, direction text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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