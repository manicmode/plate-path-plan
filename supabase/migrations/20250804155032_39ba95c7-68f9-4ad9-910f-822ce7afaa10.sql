-- Create influencers table
CREATE TABLE public.influencers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bio TEXT,
  profile_image_url TEXT,
  category TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create public_challenges table
CREATE TABLE public.public_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  goal_value INTEGER,
  goal_unit TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reward TEXT,
  banner_image_url TEXT,
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create public_challenge_participants table
CREATE TABLE public.public_challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.public_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_value INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Add influencer role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'influencer';

-- RLS Policies for influencers table
CREATE POLICY "Influencers can view and update their own data"
ON public.influencers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all influencers"
ON public.influencers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all influencers"
ON public.influencers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for public_challenges table
CREATE POLICY "Anyone can view active public challenges"
ON public.public_challenges
FOR SELECT
USING (is_active = true);

CREATE POLICY "Influencers can create challenges"
ON public.public_challenges
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'influencer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Challenge creators can update their challenges"
ON public.public_challenges
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all challenges"
ON public.public_challenges
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for public_challenge_participants table
CREATE POLICY "Users can join challenges"
ON public.public_challenge_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own participations"
ON public.public_challenge_participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Challenge creators can view participants"
ON public.public_challenge_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.public_challenges 
    WHERE id = challenge_id AND created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their own progress"
ON public.public_challenge_participants
FOR UPDATE
USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_public_challenges_updated_at
  BEFORE UPDATE ON public.public_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();