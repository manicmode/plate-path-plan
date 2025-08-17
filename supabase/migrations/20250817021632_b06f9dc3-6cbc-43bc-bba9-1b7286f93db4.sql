-- Enable arena emoji tray feature flag
INSERT INTO public.feature_flags(key, enabled)
VALUES ('arena_emoji_tray', true)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;