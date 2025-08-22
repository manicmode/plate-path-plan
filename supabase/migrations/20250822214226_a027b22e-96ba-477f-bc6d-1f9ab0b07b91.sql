-- Voice action audit (secure + idempotent)

CREATE TABLE IF NOT EXISTS public.voice_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tool TEXT NOT NULL,
  args_json JSONB NOT NULL,
  ok BOOLEAN NOT NULL,
  error_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (Optional – only if you're OK with a FK into auth.users, otherwise skip)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'voice_action_audit_user_fk'
  ) THEN
    ALTER TABLE public.voice_action_audit
      ADD CONSTRAINT voice_action_audit_user_fk
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- RLS: enable + force
ALTER TABLE public.voice_action_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_action_audit FORCE ROW LEVEL SECURITY;

-- Clean grants (defense-in-depth)
REVOKE ALL ON public.voice_action_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.voice_action_audit TO authenticated;   -- users can read their own via RLS
GRANT SELECT, INSERT ON public.voice_action_audit TO service_role; -- edge func can write

-- Policies
DROP POLICY IF EXISTS voice_audit_select_own ON public.voice_action_audit;
CREATE POLICY voice_audit_select_own
  ON public.voice_action_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role inserts (browser cannot)
DROP POLICY IF EXISTS voice_audit_insert_service ON public.voice_action_audit;
CREATE POLICY voice_audit_insert_service
  ON public.voice_action_audit
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- (Optional) allow service_role to read all for debugging/ops
DROP POLICY IF EXISTS voice_audit_select_service ON public.voice_action_audit;
CREATE POLICY voice_audit_select_service
  ON public.voice_action_audit
  FOR SELECT
  TO service_role
  USING (true);

-- Index to support rate limiting
CREATE INDEX IF NOT EXISTS idx_voice_action_audit_user_created
  ON public.voice_action_audit (user_id, created_at DESC);