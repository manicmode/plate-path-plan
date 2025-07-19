-- Create private challenges system
CREATE TABLE public.private_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  creator_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'hydration', 'nutrition', 'exercise', 'mindfulness'
  challenge_type TEXT NOT NULL DEFAULT 'habit', -- 'habit', 'streak', 'target'
  target_metric TEXT, -- 'water_glasses', 'veggie_servings', 'steps', etc.
  target_value NUMERIC, -- target amount (e.g., 8 for 8 glasses)
  target_unit TEXT, -- 'glasses', 'servings', 'minutes'
  duration_days INTEGER NOT NULL,
  start_date DATE NOT NULL,
  max_participants INTEGER NOT NULL DEFAULT 20,
  invited_user_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed'
  badge_icon TEXT NOT NULL DEFAULT '🏆',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create private challenge participations
CREATE TABLE public.private_challenge_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  private_challenge_id UUID REFERENCES public.private_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_creator BOOLEAN NOT NULL DEFAULT false,
  progress_value NUMERIC NOT NULL DEFAULT 0,
  streak_count INTEGER NOT NULL DEFAULT 0,
  completed_days INTEGER NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  daily_completions JSONB NOT NULL DEFAULT '{}', -- {date: completion_status}
  completed_at TIMESTAMP WITH TIME ZONE,
  last_progress_update TIMESTAMP WITH TIME ZONE,
  UNIQUE(private_challenge_id, user_id)
);

-- Create challenge invitations table
CREATE TABLE public.challenge_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  private_challenge_id UUID REFERENCES public.private_challenges(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(private_challenge_id, invitee_id)
);

-- Enable Row Level Security
ALTER TABLE public.private_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for private_challenges
CREATE POLICY "Users can view challenges they created or are invited to" 
ON public.private_challenges 
FOR SELECT 
USING (
  auth.uid() = creator_id OR 
  auth.uid() = ANY(invited_user_ids) OR
  EXISTS (
    SELECT 1 FROM public.private_challenge_participations 
    WHERE private_challenge_id = private_challenges.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own private challenges" 
ON public.private_challenges 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their challenges" 
ON public.private_challenges 
FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their challenges" 
ON public.private_challenges 
FOR DELETE 
USING (auth.uid() = creator_id);

-- RLS Policies for private_challenge_participations
CREATE POLICY "Users can view participations for challenges they're part of" 
ON public.private_challenge_participations 
FOR SELECT 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.private_challenges pc 
    WHERE pc.id = private_challenge_id 
    AND (pc.creator_id = auth.uid() OR auth.uid() = ANY(pc.invited_user_ids))
  )
);

CREATE POLICY "Users can create their own participations" 
ON public.private_challenge_participations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
ON public.private_challenge_participations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations" 
ON public.private_challenge_participations 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for challenge_invitations
CREATE POLICY "Users can view their own invitations" 
ON public.challenge_invitations 
FOR SELECT 
USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations for their challenges" 
ON public.challenge_invitations 
FOR INSERT 
WITH CHECK (
  auth.uid() = inviter_id AND
  EXISTS (
    SELECT 1 FROM public.private_challenges 
    WHERE id = private_challenge_id AND creator_id = auth.uid()
  )
);

CREATE POLICY "Invitees can update their invitation status" 
ON public.challenge_invitations 
FOR UPDATE 
USING (auth.uid() = invitee_id);

-- Create indexes for better performance
CREATE INDEX idx_private_challenges_creator ON public.private_challenges(creator_id);
CREATE INDEX idx_private_challenges_status ON public.private_challenges(status);
CREATE INDEX idx_private_challenges_invited_users ON public.private_challenges USING GIN(invited_user_ids);
CREATE INDEX idx_private_participations_challenge ON public.private_challenge_participations(private_challenge_id);
CREATE INDEX idx_private_participations_user ON public.private_challenge_participations(user_id);
CREATE INDEX idx_challenge_invitations_invitee ON public.challenge_invitations(invitee_id);
CREATE INDEX idx_challenge_invitations_status ON public.challenge_invitations(status);

-- Function to update challenge status based on start date
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

-- Function to accept challenge invitation
CREATE OR REPLACE FUNCTION public.accept_challenge_invitation(invitation_id_param UUID)
RETURNS boolean AS $$
DECLARE
  invitation_record RECORD;
  challenge_record RECORD;
  current_participants INTEGER;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM public.challenge_invitations 
  WHERE id = invitation_id_param 
    AND invitee_id = auth.uid() 
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record 
  FROM public.private_challenges 
  WHERE id = invitation_record.private_challenge_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if challenge is full
  SELECT COUNT(*) INTO current_participants
  FROM public.private_challenge_participations 
  WHERE private_challenge_id = challenge_record.id;
  
  IF current_participants >= challenge_record.max_participants THEN
    RETURN false;
  END IF;
  
  -- Update invitation status
  UPDATE public.challenge_invitations 
  SET status = 'accepted', responded_at = now()
  WHERE id = invitation_id_param;
  
  -- Create participation record
  INSERT INTO public.private_challenge_participations (
    private_challenge_id,
    user_id,
    is_creator
  ) VALUES (
    challenge_record.id,
    invitation_record.invitee_id,
    false
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate private challenge progress
CREATE OR REPLACE FUNCTION public.calculate_private_challenge_progress(participation_id_param UUID)
RETURNS void AS $$
DECLARE
  participation_record RECORD;
  challenge_record RECORD;
  total_days INTEGER;
  completed_days INTEGER;
  current_streak INTEGER := 0;
  temp_streak INTEGER := 0;
  daily_data JSONB;
  completion_pct NUMERIC;
  challenge_start DATE;
  days_elapsed INTEGER;
BEGIN
  -- Get participation details
  SELECT * INTO participation_record 
  FROM public.private_challenge_participations 
  WHERE id = participation_id_param;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get challenge details
  SELECT * INTO challenge_record 
  FROM public.private_challenges 
  WHERE id = participation_record.private_challenge_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  challenge_start := challenge_record.start_date;
  total_days := challenge_record.duration_days;
  daily_data := participation_record.daily_completions;
  days_elapsed := LEAST(total_days, GREATEST(0, CURRENT_DATE - challenge_start + 1));
  
  -- Count completed days and calculate streaks
  completed_days := 0;
  FOR i IN 0..(days_elapsed-1) LOOP
    IF (daily_data->((challenge_start + i)::TEXT))::BOOLEAN IS TRUE THEN
      completed_days := completed_days + 1;
      temp_streak := temp_streak + 1;
      IF challenge_start + i = CURRENT_DATE - INTERVAL '1 day' OR 
         challenge_start + i = CURRENT_DATE THEN
        current_streak := temp_streak;
      END IF;
    ELSE
      temp_streak := 0;
    END IF;
  END LOOP;
  
  -- Calculate completion percentage
  completion_pct := CASE 
    WHEN total_days > 0 THEN (completed_days::NUMERIC / total_days::NUMERIC) * 100
    ELSE 0 
  END;
  
  -- Update participation record
  UPDATE public.private_challenge_participations 
  SET 
    progress_value = completed_days,
    completed_days = completed_days,
    streak_count = current_streak,
    completion_percentage = completion_pct,
    completed_at = CASE WHEN completion_pct >= 100 AND completed_at IS NULL THEN now() ELSE completed_at END,
    last_progress_update = now()
  WHERE id = participation_id_param;
END;
$$ LANGUAGE plpgsql;