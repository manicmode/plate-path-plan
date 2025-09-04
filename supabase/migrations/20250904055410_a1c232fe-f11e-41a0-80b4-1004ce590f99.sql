BEGIN;

INSERT INTO public.feature_flags(key, enabled, created_at, updated_at)
VALUES ('breathing_nudges_enabled', true, now(), now())
ON CONFLICT(key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      updated_at = now();

COMMIT;

-- Verify
SELECT key, enabled, updated_at
FROM public.feature_flags
WHERE key = 'breathing_nudges_enabled';