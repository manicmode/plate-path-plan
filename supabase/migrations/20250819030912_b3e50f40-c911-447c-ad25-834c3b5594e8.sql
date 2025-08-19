-- Safely migrate jsonb columns to text[] without data loss
ALTER TABLE public.user_profile
  ALTER COLUMN goals TYPE text[] USING
    (SELECT COALESCE(array_agg(x), ARRAY[]::text[])
       FROM jsonb_array_elements_text(goals) AS x),
  ALTER COLUMN constraints TYPE text[] USING
    (SELECT COALESCE(array_agg(x), ARRAY[]::text[])
       FROM jsonb_array_elements_text(constraints) AS x),
  ALTER COLUMN preferences TYPE text[] USING
    (SELECT COALESCE(array_agg(x), ARRAY[]::text[])
       FROM jsonb_array_elements_text(preferences) AS x);

-- Enforce NOT NULL + defaults
ALTER TABLE public.user_profile
  ALTER COLUMN goals        SET NOT NULL,
  ALTER COLUMN goals        SET DEFAULT '{}',
  ALTER COLUMN constraints  SET NOT NULL,
  ALTER COLUMN constraints  SET DEFAULT '{}',
  ALTER COLUMN preferences  SET NOT NULL,
  ALTER COLUMN preferences  SET DEFAULT '{}';

-- Update rpc_upsert_user_profile to accept jsonb and cast to text[] internally
CREATE OR REPLACE FUNCTION public.rpc_upsert_user_profile(
  p_goals        jsonb DEFAULT '[]'::jsonb,
  p_constraints  jsonb DEFAULT '[]'::jsonb,
  p_preferences  jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_goals        text[];
  v_constraints  text[];
  v_preferences  text[];
BEGIN
  -- Cast jsonb arrays to text[]
  SELECT COALESCE(array_agg(x)::text[], ARRAY[]::text[])
    INTO v_goals
  FROM jsonb_array_elements_text(p_goals) AS x;

  SELECT COALESCE(array_agg(x)::text[], ARRAY[]::text[])
    INTO v_constraints
  FROM jsonb_array_elements_text(p_constraints) AS x;

  SELECT COALESCE(array_agg(x)::text[], ARRAY[]::text[])
    INTO v_preferences
  FROM jsonb_array_elements_text(p_preferences) AS x;

  -- Ensure caller has a row
  PERFORM public.ensure_user_profile();

  -- Upsert
  UPDATE public.user_profile
     SET goals       = v_goals,
         constraints = v_constraints,
         preferences = v_preferences,
         updated_at  = now()
   WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.user_profile (user_id, goals, constraints, preferences)
    VALUES (auth.uid(), v_goals, v_constraints, v_preferences)
    ON CONFLICT (user_id) DO UPDATE
      SET goals       = EXCLUDED.goals,
          constraints = EXCLUDED.constraints,
          preferences = EXCLUDED.preferences,
          updated_at  = now();
  END IF;
END;
$$;

-- Lock down execution
REVOKE ALL ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb)
IS 'Upserts profile prefs for current user; casts jsonb arrays to text[]; relies on auth.uid().';