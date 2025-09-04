-- Create or update the qa_routes_enabled feature flag
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('qa_routes_enabled', true, 'Enable QA validation routes and tools for nudge system testing')
ON CONFLICT (key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      description = EXCLUDED.description,
      updated_at = now();