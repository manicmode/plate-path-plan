-- Add arena_profile_modal feature flag
INSERT INTO public.feature_flags(key, enabled)
VALUES ('arena_profile_modal', true)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;