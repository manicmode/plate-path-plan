-- Create or update the qa_routes_enabled feature flag (without description)
INSERT INTO public.feature_flags (key, enabled)
VALUES ('qa_routes_enabled', true)
ON CONFLICT (key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      updated_at = now();