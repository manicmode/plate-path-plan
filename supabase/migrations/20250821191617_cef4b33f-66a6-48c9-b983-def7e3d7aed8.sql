-- Voice Coach Schema: Hardening tweaks for constraints, indexes, and storage policies

-- 1) Minimal constraints (defense in depth)
ALTER TABLE public.voice_quota
  ALTER COLUMN plan_minutes SET DEFAULT 200,
  ALTER COLUMN used_seconds_month SET DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'voice_quota_nonneg_ck'
  ) THEN
    ALTER TABLE public.voice_quota
      ADD CONSTRAINT voice_quota_nonneg_ck
      CHECK (plan_minutes >= 0 AND used_seconds_month >= 0);
  END IF;
END $$;

-- 2) Helpful indexes for query + retention tasks
CREATE INDEX IF NOT EXISTS idx_voice_session_user ON public.voice_session(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_turn_session_time ON public.voice_turn(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_turn_role ON public.voice_turn(role);
CREATE INDEX IF NOT EXISTS idx_voice_quota_month ON public.voice_quota(month_key);

-- 3) Storage: allow service role to UPDATE/DELETE TTS files (rotate/cleanup)
DROP POLICY IF EXISTS "Service updates voice replies" ON storage.objects;
CREATE POLICY "Service updates voice replies"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id = 'voice-replies')
WITH CHECK (bucket_id = 'voice-replies');

DROP POLICY IF EXISTS "Service deletes voice replies" ON storage.objects;
CREATE POLICY "Service deletes voice replies"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'voice-replies');

-- 4) (Optional, but nice) narrow SELECT on storage to the bucket only
DROP POLICY IF EXISTS "Public read voice replies" ON storage.objects;
CREATE POLICY "Public read voice replies"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-replies');