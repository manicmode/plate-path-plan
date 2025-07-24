-- Create user roles system for proper admin access control
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
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
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Fix existing database functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, selected_trackers)
  VALUES (NEW.id, ARRAY['calories', 'hydration', 'supplements']);
  
  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Fix search_path for all existing functions
CREATE OR REPLACE FUNCTION public.find_user_friends(contact_hashes text[])
RETURNS TABLE(user_id uuid, email text, phone text, contact_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
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

CREATE OR REPLACE FUNCTION public.search_users_by_username_email(search_term text)
RETURNS TABLE(user_id uuid, username text, email text, display_name text, first_name text, last_name text, current_nutrition_streak integer, current_hydration_streak integer, current_supplement_streak integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
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
$$;