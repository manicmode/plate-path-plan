-- Fix infinite recursion in challenge_members RLS policies
-- The issue is likely that policies are referencing the same table they're applied to

-- Drop existing problematic policies
DROP POLICY IF EXISTS "read_members" ON public.challenge_members;
DROP POLICY IF EXISTS "join_public_or_owner_adds_private" ON public.challenge_members;
DROP POLICY IF EXISTS "member_updates_self" ON public.challenge_members;

-- Create safe RLS policies for challenge_members
-- Policy for reading members: allow if user is owner of challenge OR user is a member
CREATE POLICY "Users can view challenge members" 
ON public.challenge_members 
FOR SELECT 
USING (
  -- User can see members if they own the challenge
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_members.challenge_id 
    AND c.owner_user_id = auth.uid()
  )
  OR
  -- Or if the challenge is public
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_members.challenge_id 
    AND c.visibility = 'public'
  )
  OR
  -- Or if user is a member of this challenge
  challenge_members.user_id = auth.uid()
);

-- Policy for joining challenges
CREATE POLICY "Users can join public challenges or be added to private ones" 
ON public.challenge_members 
FOR INSERT 
WITH CHECK (
  -- User can join if it's their own membership
  user_id = auth.uid()
  AND (
    -- And either the challenge is public
    EXISTS (
      SELECT 1 FROM public.challenges c 
      WHERE c.id = challenge_members.challenge_id 
      AND c.visibility = 'public'
    )
    OR
    -- Or user owns the challenge (for auto-join on creation)
    EXISTS (
      SELECT 1 FROM public.challenges c 
      WHERE c.id = challenge_members.challenge_id 
      AND c.owner_user_id = auth.uid()
    )
  )
);

-- Policy for updating membership (leaving, etc)
CREATE POLICY "Users can update their own membership" 
ON public.challenge_members 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());