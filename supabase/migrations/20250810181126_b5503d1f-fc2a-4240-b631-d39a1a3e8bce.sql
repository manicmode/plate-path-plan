-- Update handle_new_user_profile to align with selected_trackers type (text[])
-- and robustly handle JSON metadata; keep owner as postgres

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
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
    COALESCE(
      CASE
        WHEN (NEW.raw_user_meta_data->'selected_trackers') IS NOT NULL THEN
          ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'selected_trackers'))
        ELSE ARRAY['calories','hydration','supplements']::text[]
      END,
      ARRAY['calories','hydration','supplements']::text[]
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name,
        avatar_url = EXCLUDED.avatar_url;

  -- default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END
$$;

-- Ensure function owner remains postgres (bypass RLS reliably)
ALTER FUNCTION public.handle_new_user_profile() OWNER TO postgres;

COMMIT;