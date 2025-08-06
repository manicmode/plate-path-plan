-- Secure public challenge tables with proper RLS policies

-- First, remove existing permissive policies on public_challenges
DROP POLICY IF EXISTS "Anyone can view public challenges" ON public.public_challenges;
DROP POLICY IF EXISTS "Authenticated users can update participant count" ON public.public_challenges;

-- Create public_challenge_participations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.public_challenge_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.public_challenges(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_creator BOOLEAN NOT NULL DEFAULT false,
  progress_value NUMERIC DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

-- Create public_challenge_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.public_challenge_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.public_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  text TEXT,
  emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tagged_users UUID[] DEFAULT '{}'::uuid[]
);

-- Enable RLS on all tables (if not already enabled)
ALTER TABLE public.public_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_challenge_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public_challenges
-- Only allow SELECT if user is participant or admin
CREATE POLICY "Users can view challenges they participate in"
ON public.public_challenges
FOR SELECT
USING (
  -- User is a participant
  EXISTS (
    SELECT 1 FROM public.public_challenge_participations pcp
    WHERE pcp.challenge_id = public_challenges.id 
    AND pcp.user_id = auth.uid()
  )
  OR
  -- User is admin
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Only admins can INSERT, UPDATE, DELETE challenges
CREATE POLICY "Only admins can create challenges"
ON public.public_challenges
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update challenges"
ON public.public_challenges
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete challenges"
ON public.public_challenges
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create policies for public_challenge_participations
CREATE POLICY "Users can view their own participations"
ON public.public_challenge_participations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own participations"
ON public.public_challenge_participations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations"
ON public.public_challenge_participations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations"
ON public.public_challenge_participations
FOR DELETE
USING (auth.uid() = user_id);

-- Create policies for public_challenge_messages
-- Users can view messages only if they're participants in the challenge
CREATE POLICY "Users can view messages from challenges they participate in"
ON public.public_challenge_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.public_challenge_participations pcp
    WHERE pcp.challenge_id = public_challenge_messages.challenge_id 
    AND pcp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own messages"
ON public.public_challenge_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.public_challenge_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.public_challenge_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for public_challenge_participations
CREATE TRIGGER update_public_challenge_participations_updated_at
BEFORE UPDATE ON public.public_challenge_participations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();