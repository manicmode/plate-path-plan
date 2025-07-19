-- Add search functionality for users
CREATE OR REPLACE FUNCTION public.search_users_by_username_email(search_term text)
RETURNS TABLE(
  user_id uuid,
  username text,
  email text,
  display_name text,
  first_name text,
  last_name text,
  current_nutrition_streak integer,
  current_hydration_streak integer,
  current_supplement_streak integer
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to get pending friend requests (incoming and outgoing)
CREATE OR REPLACE FUNCTION public.get_pending_friend_requests()
RETURNS TABLE(
  request_id uuid,
  requester_id uuid,
  requested_id uuid,
  requester_name text,
  requested_name text,
  requester_email text,
  requested_email text,
  created_at timestamp with time zone,
  status text,
  direction text -- 'incoming' or 'outgoing'
)
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to reject friend request
CREATE OR REPLACE FUNCTION public.reject_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Add unique constraint to prevent duplicate friend requests
ALTER TABLE public.user_friends 
ADD CONSTRAINT unique_friendship 
UNIQUE (user_id, friend_id);