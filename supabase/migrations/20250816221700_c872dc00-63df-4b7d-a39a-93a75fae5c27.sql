-- Events that contribute to scores (append-only)
CREATE TABLE IF NOT EXISTS public.arena_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  points numeric NOT NULL CHECK (points >= 0),
  kind text NOT NULL,                        -- e.g., 'log', 'streak', 'bonus'
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arena_events_cu ON public.arena_events(challenge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_arena_events_time ON public.arena_events(occurred_at DESC);

ALTER TABLE public.arena_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_arena_events_select ON public.arena_events;
CREATE POLICY p_arena_events_select ON public.arena_events
  FOR SELECT TO authenticated USING (true);
-- no direct inserts from clients; use RPC:

-- API: award points to the caller (idempotency is caller's responsibility via kind/occurred_at)
CREATE OR REPLACE FUNCTION public.arena_award_points(
  p_points numeric,
  p_kind text,
  p_challenge_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cid uuid;
BEGIN
  IF p_points <= 0 THEN RETURN; END IF;
  IF p_challenge_id IS NULL THEN
    SELECT id INTO v_cid FROM public.arena_challenges WHERE status='active' ORDER BY starts_at DESC LIMIT 1;
  ELSE
    v_cid := p_challenge_id;
  END IF;
  -- ensure membership
  INSERT INTO public.arena_memberships(challenge_id, user_id, status)
  VALUES (v_cid, auth.uid(), 'active')
  ON CONFLICT (challenge_id, user_id) DO UPDATE SET status='active';
  -- record event
  INSERT INTO public.arena_events(challenge_id, user_id, points, kind)
  VALUES (v_cid, auth.uid(), p_points, p_kind);
END
$$;

REVOKE ALL ON FUNCTION public.arena_award_points(numeric,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_award_points(numeric,text,uuid) TO authenticated;