-- Arena scoring: client smoke test, UI panel, and read policies

-- Enable RLS first (no-op if already enabled)
ALTER TABLE public.arena_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_memberships  ENABLE ROW LEVEL SECURITY;

-- Idempotent policy creation (works on all PG versions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='arena_events' AND policyname='p_arena_events_select_mine'
  ) THEN
    CREATE POLICY p_arena_events_select_mine
    ON public.arena_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='arena_memberships' AND policyname='p_arena_memberships_select_mine'
  ) THEN
    CREATE POLICY p_arena_memberships_select_mine
    ON public.arena_memberships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- ON CONFLICT target for membership upsert (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_arena_memberships_cu
ON public.arena_memberships (challenge_id, user_id);

-- Insert a smoke-test challenge ONLY if none active exists
INSERT INTO public.arena_challenges (id, status, starts_at, title)
SELECT gen_random_uuid(), 'active', now(), 'Smoke Test Challenge'
WHERE NOT EXISTS (
  SELECT 1 FROM public.arena_challenges WHERE status = 'active'
);