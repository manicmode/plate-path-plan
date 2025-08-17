-- =========================
-- A) RUNTIME FLAGS HARDENING
-- =========================
-- Preconditions (idempotent): table + RLS should already exist; keep it idempotent.
CREATE TABLE IF NOT EXISTS public.runtime_flags (
  name        text PRIMARY KEY,
  enabled     boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.runtime_flags ENABLE ROW LEVEL SECURITY;

-- Only authenticated may read; writes blocked (service_role bypasses RLS).
-- Remove old broad policies, then re-create precise ones.
DROP POLICY IF EXISTS runtime_flags_select ON public.runtime_flags;
DROP POLICY IF EXISTS runtime_flags_no_writes ON public.runtime_flags;

CREATE POLICY runtime_flags_select ON public.runtime_flags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY runtime_flags_no_writes ON public.runtime_flags
  FOR ALL
  USING (false);

-- Privileges (defense in depth)
REVOKE SELECT ON TABLE public.runtime_flags FROM anon;
GRANT  SELECT ON TABLE public.runtime_flags TO authenticated;
GRANT  ALL    ON TABLE public.runtime_flags TO service_role;

-- Realtime support for the flag hook (so UI updates instantly)
ALTER TABLE public.runtime_flags REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='runtime_flags'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.runtime_flags;
  END IF;
END $$;

-- ========================================
-- B) CHAT MUTATION LOCKDOWN (defense-in-depth)
-- ========================================
-- Explicitly deny UPDATE/DELETE for authenticated; INSERT/SELECT policies remain as-is.
DROP POLICY IF EXISTS arena_chat_update ON public.arena_chat_messages;
CREATE POLICY arena_chat_update ON public.arena_chat_messages
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS arena_chat_delete ON public.arena_chat_messages;
CREATE POLICY arena_chat_delete ON public.arena_chat_messages
  FOR DELETE TO authenticated
  USING (false);

-- Optional: explicit privilege revokes (RLS already denies, this is additive)
REVOKE UPDATE, DELETE ON TABLE public.arena_chat_messages FROM authenticated;