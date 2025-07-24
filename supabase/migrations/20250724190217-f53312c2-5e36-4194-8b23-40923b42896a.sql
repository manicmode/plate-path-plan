-- Fix database function security by adding explicit search_path settings
-- This prevents search path manipulation attacks

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'moderator' THEN 2 
      WHEN 'user' THEN 3 
    END 
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.search_users_by_username_email(search_term text)
 RETURNS TABLE(user_id uuid, username text, email text, display_name text, first_name text, last_name text, current_nutrition_streak integer, current_hydration_streak integer, current_supplement_streak integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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
    up.user_id != auth.uid()
    AND (
      LOWER(COALESCE(up.first_name || ' ' || up.last_name, '')) ILIKE '%' || LOWER(search_term) || '%'
      OR LOWER(au.email) ILIKE '%' || LOWER(search_term) || '%'
    )
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

CREATE OR REPLACE FUNCTION public.update_follow_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
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

-- Fix user_notifications check constraint issue
-- Add proper validation for notification types
ALTER TABLE public.user_notifications 
DROP CONSTRAINT IF EXISTS user_notifications_type_check;

ALTER TABLE public.user_notifications 
ADD CONSTRAINT user_notifications_type_check 
CHECK (type IN (
  'meal_suggestion', 
  'toxin_alert', 
  'friend_request', 
  'challenge_invitation',
  'milestone_achieved',
  'weekly_report',
  'monthly_report',
  'body_scan_reminder',
  'scan_completed_praise',
  'check_reminders',
  'system_notification'
));