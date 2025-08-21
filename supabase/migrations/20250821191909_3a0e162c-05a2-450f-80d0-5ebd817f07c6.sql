-- Voice Coach MVP Schema: Complete isolated module with hardening

-- VOICE TABLES
CREATE TABLE IF NOT EXISTS public.voice_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  total_seconds integer DEFAULT 0,
  cost_cents integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.voice_turn (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.voice_session(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','tool')),
  text text,
  audio_url text,
  tool_name text,
  tool_payload jsonb DEFAULT '{}'::jsonb,
  tokens_prompt integer DEFAULT 0,
  tokens_output integer DEFAULT 0,
  ms_asr integer DEFAULT 0,
  ms_tts integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.voice_quota (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_minutes integer NOT NULL DEFAULT 200,
  used_seconds_month integer NOT NULL DEFAULT 0,
  month_key text NOT NULL DEFAULT to_char(now(),'YYYY-MM')
);

CREATE TABLE IF NOT EXISTS public.voice_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  tool_name text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- HARDENING: Constraints (defense in depth)
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

-- HARDENING: Performance indexes
CREATE INDEX IF NOT EXISTS idx_voice_session_user ON public.voice_session(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_turn_session_time ON public.voice_turn(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_turn_role ON public.voice_turn(role);
CREATE INDEX IF NOT EXISTS idx_voice_quota_month ON public.voice_quota(month_key);

-- RLS POLICIES
ALTER TABLE public.voice_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_turn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_audit ENABLE ROW LEVEL SECURITY;

-- User can only see their own data
DROP POLICY IF EXISTS voice_session_owner ON public.voice_session;
CREATE POLICY voice_session_owner ON public.voice_session
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS voice_turn_owner ON public.voice_turn;
CREATE POLICY voice_turn_owner ON public.voice_turn
FOR SELECT USING (
  session_id IN (SELECT id FROM public.voice_session WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS voice_quota_owner ON public.voice_quota;
CREATE POLICY voice_quota_owner ON public.voice_quota
FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS voice_audit_owner ON public.voice_audit;
CREATE POLICY voice_audit_owner ON public.voice_audit
FOR SELECT USING (user_id = auth.uid());

-- Privileges (writes only via service_role)
REVOKE ALL ON public.voice_session, public.voice_turn, public.voice_quota, public.voice_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.voice_session, public.voice_turn, public.voice_quota, public.voice_audit TO authenticated;
GRANT ALL ON public.voice_session, public.voice_turn, public.voice_quota, public.voice_audit TO service_role;

-- STORAGE for TTS replies (public read, service writes)
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-replies','voice-replies', true)
ON CONFLICT (id) DO NOTHING;

-- HARDENING: Complete storage policies
DROP POLICY IF EXISTS "Public read voice replies" ON storage.objects;
CREATE POLICY "Public read voice replies"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-replies');

DROP POLICY IF EXISTS "Service writes voice replies" ON storage.objects;
CREATE POLICY "Service writes voice replies"
ON storage.objects FOR INSERT TO service_role 
WITH CHECK (bucket_id = 'voice-replies');

DROP POLICY IF EXISTS "Service updates voice replies" ON storage.objects;
CREATE POLICY "Service updates voice replies"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id = 'voice-replies')
WITH CHECK (bucket_id = 'voice-replies');

DROP POLICY IF EXISTS "Service deletes voice replies" ON storage.objects;
CREATE POLICY "Service deletes voice replies"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'voice-replies');