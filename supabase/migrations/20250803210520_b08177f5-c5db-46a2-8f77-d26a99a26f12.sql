-- Step 1: Replace handle_new_user_profile() function to extract names properly
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id, 
    selected_trackers,
    first_name,
    last_name,
    avatar_url
  )
  VALUES (
    NEW.id, 
    ARRAY['calories', 'hydration', 'supplements'],
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    avatar_url = EXCLUDED.avatar_url;

  -- Assign default 'user' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 2: Recreate the trigger (it should already exist but let's ensure it's correct)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Step 3: Backfill existing user profiles with names from auth.users
UPDATE public.user_profiles
SET
  first_name = auth_users.raw_user_meta_data->>'first_name',
  last_name = auth_users.raw_user_meta_data->>'last_name',
  avatar_url = COALESCE(user_profiles.avatar_url, auth_users.raw_user_meta_data->>'avatar_url')
FROM auth.users auth_users
WHERE user_profiles.user_id = auth_users.id
  AND (
    user_profiles.first_name IS NULL 
    OR user_profiles.last_name IS NULL 
    OR (auth_users.raw_user_meta_data->>'first_name' IS NOT NULL AND user_profiles.first_name != auth_users.raw_user_meta_data->>'first_name')
    OR (auth_users.raw_user_meta_data->>'last_name' IS NOT NULL AND user_profiles.last_name != auth_users.raw_user_meta_data->>'last_name')
  );