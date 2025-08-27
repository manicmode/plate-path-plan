-- Add feature flags for hero subtext telemetry system
INSERT INTO public.feature_flags (key, enabled, updated_at) VALUES
('subtext_telemetry_enabled', true, now()),
('subtext_digest_enabled', false, now())
ON CONFLICT (key) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();