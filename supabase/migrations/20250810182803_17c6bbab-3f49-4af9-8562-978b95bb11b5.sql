BEGIN;

-- 0) Create a tiny debug table if not exists
CREATE TABLE IF NOT EXISTS public.signup_error_logs (
  id    bigserial PRIMARY KEY,
  ts    timestamptz DEFAULT now(),
  user_id uuid,
  step  text,
  err   text,
  meta  jsonb
);

-- 1) Wrap the trigger in try/catch blocks that log and re-raise
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  trackers text[];
BEGIN
  -- compute trackers (same logic as before)
  trackers := COALESCE(
    CASE
      WHEN jsonb_typeof(NEW.raw_user_meta_data->'selected_trackers') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'selected_trackers'))
      ELSE NULL
    END,
    ARRAY['calories','hydration','supplements']::text[]
  );

  -- Insert/Upsert profile with logging
  BEGIN
    INSERT INTO public.user_profiles (user_id, selected_trackers, first_name, last_name, avatar_url)
    VALUES (
      NEW.id,
      trackers,
      COALESCE(NEW.raw_user_meta_data->>'first_name',''),
      COALESCE(NEW.raw_user_meta_data->>'last_name',''),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET first_name = EXCLUDED.first_name,
          last_name  = EXCLUDED.last_name,
          avatar_url = EXCLUDED.avatar_url;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.signup_error_logs(user_id, step, err, meta)
    VALUES (NEW.id, 'insert_user_profiles', SQLERRM,
            jsonb_build_object('raw_user_meta_data', NEW.raw_user_meta_data));
    RAISE;
  END;

  -- Insert role with logging
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.signup_error_logs(user_id, step, err, meta)
    VALUES (NEW.id, 'insert_user_roles', SQLERRM, '{}'::jsonb);
    RAISE;
  END;

  RETURN NEW;
END
$$;

ALTER FUNCTION public.handle_new_user_profile() OWNER TO postgres;

COMMIT;