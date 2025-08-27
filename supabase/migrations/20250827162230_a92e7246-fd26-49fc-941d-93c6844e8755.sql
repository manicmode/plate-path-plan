-- Add feature flags for hero subtext telemetry system
INSERT INTO public.feature_flags (key, enabled, description, category, created_at, updated_at) VALUES
('subtext_telemetry_enabled', true, 'Enable telemetry logging for hero subtext content engine', 'telemetry', now(), now()),
('subtext_digest_enabled', false, 'Enable daily digest reports for hero subtext analytics', 'telemetry', now(), now())
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = now();