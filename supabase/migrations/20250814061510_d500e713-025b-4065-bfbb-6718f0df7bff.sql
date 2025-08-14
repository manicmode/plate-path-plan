-- Allow a user to read participations of ANYONE who shares their same Rank-of-20 challenge
DROP POLICY IF EXISTS rls_rank20_peers_select ON public.private_challenge_participations;

CREATE POLICY rls_rank20_peers_select
ON public.private_challenge_participations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.private_challenge_participations p2
    JOIN public.private_challenges pc ON pc.id = p2.private_challenge_id
    WHERE p2.user_id = auth.uid()
      AND pc.challenge_type = 'rank_of_20'
      AND p2.private_challenge_id = public.private_challenge_participations.private_challenge_id
  )
);