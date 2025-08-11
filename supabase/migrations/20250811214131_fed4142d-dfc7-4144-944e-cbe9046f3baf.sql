-- Remove the broad SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view challenge members" ON public.challenge_members;

-- 1) Users can view their OWN membership rows (no reference to challenges)
CREATE POLICY "View own membership rows"
ON public.challenge_members
FOR SELECT
USING (user_id = auth.uid());

-- 2) Challenge OWNERS can view all members of their challenges
CREATE POLICY "Owner can view members"
ON public.challenge_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_members.challenge_id
      AND c.owner_user_id = auth.uid()
  )
);