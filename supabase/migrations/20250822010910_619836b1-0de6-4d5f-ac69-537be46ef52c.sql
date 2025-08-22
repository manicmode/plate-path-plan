-- 1) Make sure the kill switch exists and is OFF (global)
INSERT INTO public.feature_flags (key, enabled)
VALUES ('voice_coach_disabled', false)
ON CONFLICT (key) DO UPDATE
SET enabled = EXCLUDED.enabled, updated_at = now();

-- 2) Ensure the MVP flag exists (default OFF globally)
INSERT INTO public.feature_flags (key, enabled)
VALUES ('voice_coach_mvp', false)
ON CONFLICT (key) DO NOTHING;

-- 3) Enable MVP only for your account
INSERT INTO public.user_feature_flags (user_id, flag_key, enabled)
SELECT id, 'voice_coach_mvp', true
FROM auth.users
WHERE email = 'ashkan_e2000@yahoo.com'
ON CONFLICT (user_id, flag_key)
DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();

-- 4) Sanity check
SELECT
  ff.key,
  ff.enabled         AS global_enabled,
  uff.enabled        AS user_enabled,
  COALESCE(uff.enabled, ff.enabled) AS resolved_enabled
FROM public.feature_flags ff
LEFT JOIN public.user_feature_flags uff
  ON uff.flag_key = ff.key
 AND uff.user_id = (SELECT id FROM auth.users WHERE email='ashkan_e2000@yahoo.com')
WHERE ff.key IN ('voice_coach_disabled','voice_coach_mvp');