-- Reset any old policies
DROP POLICY IF EXISTS read_challenge_messages ON public.challenge_messages;
DROP POLICY IF EXISTS post_challenge_messages ON public.challenge_messages;
DROP POLICY IF EXISTS select_challenge_messages ON public.challenge_messages;
DROP POLICY IF EXISTS insert_challenge_messages ON public.challenge_messages;

-- SELECT: owner or joined member of public OR private challenge
CREATE POLICY select_challenge_messages
ON public.challenge_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.challenges c
    LEFT JOIN public.challenge_members m
      ON m.challenge_id = c.id
     AND m.user_id = auth.uid()
     AND m.status = 'joined'
    WHERE c.id = challenge_messages.challenge_id
      AND (c.owner_user_id = auth.uid() OR m.user_id IS NOT NULL)
  )
  OR EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    LEFT JOIN public.private_challenge_participations p
      ON p.private_challenge_id = pc.id
     AND p.user_id = auth.uid()
    WHERE pc.id = challenge_messages.challenge_id
      AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
  )
);

-- INSERT: same rule as SELECT
CREATE POLICY insert_challenge_messages
ON public.challenge_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.challenges c
    LEFT JOIN public.challenge_members m
      ON m.challenge_id = c.id
     AND m.user_id = auth.uid()
     AND m.status = 'joined'
    WHERE c.id = challenge_messages.challenge_id
      AND (c.owner_user_id = auth.uid() OR m.user_id IS NOT NULL)
  )
  OR EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    LEFT JOIN public.private_challenge_participations p
      ON p.private_challenge_id = pc.id
     AND p.user_id = auth.uid()
    WHERE pc.id = challenge_messages.challenge_id
      AND (pc.creator_id = auth.uid() OR p.user_id IS NOT NULL)
  )
);