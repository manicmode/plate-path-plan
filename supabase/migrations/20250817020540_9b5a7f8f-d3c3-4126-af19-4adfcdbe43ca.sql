-- Enable arena winners ribbon feature flag
INSERT INTO public.feature_flags(key, enabled)
VALUES ('arena_winners_ribbon', true)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;