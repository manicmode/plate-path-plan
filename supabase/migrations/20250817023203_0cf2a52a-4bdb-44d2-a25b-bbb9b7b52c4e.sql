-- Add additional arena feature flags
INSERT INTO public.feature_flags(key, enabled)
VALUES 
  ('arena_emoji_tray', true),
  ('arena_winners_ribbon', true),
  ('arena_show_winners_ribbon_below_tabs', false)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;