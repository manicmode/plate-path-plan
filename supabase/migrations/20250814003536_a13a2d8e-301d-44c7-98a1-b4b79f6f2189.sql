-- Enable RLS (idempotent)
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;

-- Allow a logged-in user to insert their own participation
-- specifically when the target challenge is the Rank-of-20 challenge
-- (i.e., a challenge that is linked from rank20_groups).
DROP POLICY IF EXISTS pcp_insert_self_r20 ON public.private_challenge_participations;
CREATE POLICY pcp_insert_self_r20
ON public.private_challenge_participations
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_groups rg
    WHERE rg.challenge_id = private_challenge_participations.private_challenge_id
  )
);

-- (Optional but helpful) allow selects of one's own participations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='private_challenge_participations'
      AND policyname='pcp_select_own'
  ) THEN
    CREATE POLICY pcp_select_own
    ON public.private_challenge_participations
    FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END$$;

-- Ensure functions are callable
GRANT EXECUTE ON FUNCTION public.assign_rank20(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._ensure_rank20_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_billboard_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_billboard_events(uuid) TO authenticated;