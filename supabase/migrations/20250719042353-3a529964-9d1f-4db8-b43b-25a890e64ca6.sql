
-- Fix RLS infinite recursion by creating security definer functions and updating policies

-- First, create security definer functions to avoid circular references
CREATE OR REPLACE FUNCTION public.get_user_private_challenge_access(challenge_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is creator, invited, or participant
  RETURN EXISTS (
    SELECT 1 FROM public.private_challenges pc 
    WHERE pc.id = challenge_id_param 
    AND (
      pc.creator_id = auth.uid() OR 
      auth.uid() = ANY(pc.invited_user_ids)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.private_challenge_participations pcp
    WHERE pcp.private_challenge_id = challenge_id_param 
    AND pcp.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view challenges they created or are invited to" ON public.private_challenges;
DROP POLICY IF EXISTS "Users can view participations for challenges they're part of" ON public.private_challenge_participations;

-- Create new simplified policies for private_challenges
CREATE POLICY "Users can view accessible private challenges" 
ON public.private_challenges 
FOR SELECT 
USING (
  auth.uid() = creator_id OR 
  auth.uid() = ANY(invited_user_ids)
);

-- Create new simplified policies for private_challenge_participations  
CREATE POLICY "Users can view their own participations or as challenge creator" 
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

-- Update challenge status function to handle pending->active transitions
CREATE OR REPLACE FUNCTION public.update_private_challenge_status()
RETURNS void AS $$
BEGIN
  -- Update challenges from pending to active when start_date is reached
  UPDATE public.private_challenges 
  SET status = 'active', updated_at = now()
  WHERE status = 'pending' 
    AND start_date <= CURRENT_DATE;
    
  -- Update challenges from active to completed when duration is over
  UPDATE public.private_challenges 
  SET status = 'completed', updated_at = now()
  WHERE status = 'active' 
    AND (start_date + INTERVAL '1 day' * duration_days) <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Run the status update function immediately
SELECT public.update_private_challenge_status();
