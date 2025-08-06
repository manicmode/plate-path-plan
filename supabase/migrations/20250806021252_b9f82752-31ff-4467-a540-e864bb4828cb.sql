-- Secure all challenge-related tables with proper RLS policies

-- Fix challenge_messages table - restrict viewing to participants only
DROP POLICY IF EXISTS "Users can view challenge messages" ON public.challenge_messages;

-- Create a more secure policy for viewing challenge messages
CREATE POLICY "Users can view messages from challenges they participate in"
ON public.challenge_messages
FOR SELECT
USING (
  -- Allow viewing if user is a participant in private challenges
  EXISTS (
    SELECT 1 FROM public.private_challenge_participations pcp
    WHERE pcp.user_id = auth.uid() 
    AND pcp.private_challenge_id::text = challenge_messages.challenge_id
  )
  OR
  -- Allow viewing of public challenge messages
  EXISTS (
    SELECT 1 FROM public.public_challenges pc
    WHERE pc.id::text = challenge_messages.challenge_id
  )
  OR
  -- Allow viewing recovery challenge messages (these use different ID format)
  challenge_messages.challenge_id LIKE 'recovery_%'
);

-- Secure public_challenges table
ALTER TABLE public.public_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public challenges"
ON public.public_challenges
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create public challenges"
ON public.public_challenges
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Challenge creators can update their challenges"
ON public.public_challenges
FOR UPDATE
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Challenge creators can delete their challenges"
ON public.public_challenges
FOR DELETE
USING (auth.uid() = creator_id);

-- Secure user_challenge_participations table
ALTER TABLE public.user_challenge_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations"
ON public.user_challenge_participations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own participations"
ON public.user_challenge_participations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations"
ON public.user_challenge_participations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations"
ON public.user_challenge_participations
FOR DELETE
USING (auth.uid() = user_id);

-- Secure private_challenge_participations table
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participations in their challenges"
ON public.private_challenge_participations
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.private_challenges pc
    WHERE pc.id = private_challenge_participations.private_challenge_id
    AND pc.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own participations"
ON public.private_challenge_participations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations"
ON public.private_challenge_participations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations"
ON public.private_challenge_participations
FOR DELETE
USING (auth.uid() = user_id);

-- Secure private_challenges table
ALTER TABLE public.private_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenges they created or participate in"
ON public.private_challenges
FOR SELECT
USING (
  auth.uid() = creator_id OR
  EXISTS (
    SELECT 1 FROM public.private_challenge_participations pcp
    WHERE pcp.private_challenge_id = private_challenges.id
    AND pcp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create private challenges"
ON public.private_challenges
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Challenge creators can update their challenges"
ON public.private_challenges
FOR UPDATE
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Challenge creators can delete their challenges"
ON public.private_challenges
FOR DELETE
USING (auth.uid() = creator_id);

-- Secure recovery_challenge_metrics table
ALTER TABLE public.recovery_challenge_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery metrics"
ON public.recovery_challenge_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery metrics"
ON public.recovery_challenge_metrics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery metrics"
ON public.recovery_challenge_metrics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);