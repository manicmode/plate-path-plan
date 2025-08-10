BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  trackers text[];
BEGIN
  -- Safe coercion for selected_trackers (text[]) with type guard
  trackers := COALESCE(
    CASE
      WHEN jsonb_typeof(NEW.raw_user_meta_data->'selected_trackers') = 'array' THEN
        ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'selected_trackers'))
      ELSE NULL
    END,
    ARRAY['calories','hydration','supplements']::text[]
  );

  INSERT INTO public.user_profiles (
    user_id,
    selected_trackers,
    first_name,
    last_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    trackers,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
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

-- Ensure owner bypasses RLS
ALTER FUNCTION public.handle_new_user_profile() OWNER TO postgres;

COMMIT;