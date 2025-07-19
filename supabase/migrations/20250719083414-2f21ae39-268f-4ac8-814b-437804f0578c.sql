-- Create teams table
CREATE TABLE public.challenge_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  challenge_id UUID REFERENCES public.private_challenges(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  member_ids UUID[] NOT NULL DEFAULT '{}',
  current_score NUMERIC NOT NULL DEFAULT 0,
  total_progress NUMERIC NOT NULL DEFAULT 0,
  team_rank INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on challenge_teams
ALTER TABLE public.challenge_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge_teams
CREATE POLICY "Team members can view their teams" ON public.challenge_teams
FOR SELECT USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);

CREATE POLICY "Team creators can create teams" ON public.challenge_teams
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Team members can update their teams" ON public.challenge_teams
FOR UPDATE USING (auth.uid() = ANY(member_ids) OR auth.uid() = creator_id);

CREATE POLICY "Team creators can delete their teams" ON public.challenge_teams
FOR DELETE USING (auth.uid() = creator_id);

-- Add team support to private_challenges
ALTER TABLE public.private_challenges 
ADD COLUMN is_team_challenge BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN team_size INTEGER DEFAULT 1,
ADD COLUMN auto_team_enabled BOOLEAN DEFAULT false,
ADD COLUMN team_ranking_basis TEXT DEFAULT 'score'; -- 'score', 'streak', 'mixed'

-- Add team support to private_challenge_participations
ALTER TABLE public.private_challenge_participations
ADD COLUMN team_id UUID REFERENCES public.challenge_teams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_challenge_teams_challenge_id ON public.challenge_teams(challenge_id);
CREATE INDEX idx_challenge_teams_member_ids ON public.challenge_teams USING GIN(member_ids);
CREATE INDEX idx_private_challenge_participations_team_id ON public.private_challenge_participations(team_id);

-- Create function to auto-assign teams based on rankings
CREATE OR REPLACE FUNCTION public.auto_assign_teams(challenge_id_param UUID, team_size_param INTEGER DEFAULT 3)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  participant_record RECORD;
  team_record RECORD;
  current_team_id UUID;
  team_member_count INTEGER := 0;
  teams_created INTEGER := 0;
  ranking_data JSONB;
BEGIN
  -- Get participants ordered by their ranking score
  FOR participant_record IN
    SELECT 
      pcp.user_id,
      pcp.id as participation_id,
      COALESCE(
        (ysp.yearly_score + 
         COALESCE(up.current_nutrition_streak, 0) * 5 + 
         COALESCE(up.current_hydration_streak, 0) * 3 +
         COALESCE(up.current_supplement_streak, 0) * 2), 0
      ) as ranking_score,
      COALESCE(up.first_name || ' ' || up.last_name, 'User') as user_name
    FROM public.private_challenge_participations pcp
    LEFT JOIN public.yearly_score_preview ysp ON pcp.user_id = ysp.user_id
    LEFT JOIN public.user_profiles up ON pcp.user_id = up.user_id
    WHERE pcp.private_challenge_id = challenge_id_param
      AND pcp.team_id IS NULL
    ORDER BY ranking_score DESC
  LOOP
    -- Create new team if needed
    IF team_member_count = 0 OR team_member_count >= team_size_param THEN
      teams_created := teams_created + 1;
      
      INSERT INTO public.challenge_teams (
        name,
        challenge_id,
        creator_id,
        member_ids
      ) VALUES (
        'Team ' || teams_created,
        challenge_id_param,
        participant_record.user_id,
        ARRAY[participant_record.user_id]
      ) RETURNING id INTO current_team_id;
      
      team_member_count := 1;
    ELSE
      -- Add to existing team
      UPDATE public.challenge_teams 
      SET member_ids = member_ids || participant_record.user_id,
          updated_at = now()
      WHERE id = current_team_id;
      
      team_member_count := team_member_count + 1;
    END IF;
    
    -- Update participation record with team assignment
    UPDATE public.private_challenge_participations
    SET team_id = current_team_id
    WHERE id = participant_record.participation_id;
  END LOOP;
  
  RETURN teams_created;
END;
$$;

-- Create function to calculate team scores
CREATE OR REPLACE FUNCTION public.update_team_scores(challenge_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_record RECORD;
  team_score NUMERIC;
  team_progress NUMERIC;
BEGIN
  FOR team_record IN
    SELECT ct.id as team_id, ct.member_ids
    FROM public.challenge_teams ct
    WHERE ct.challenge_id = challenge_id_param
  LOOP
    -- Calculate team score as sum of member progress
    SELECT 
      COALESCE(SUM(pcp.progress_value), 0),
      COALESCE(AVG(pcp.completion_percentage), 0)
    INTO team_score, team_progress
    FROM public.private_challenge_participations pcp
    WHERE pcp.team_id = team_record.team_id;
    
    -- Update team scores
    UPDATE public.challenge_teams
    SET 
      current_score = team_score,
      total_progress = team_progress,
      updated_at = now()
    WHERE id = team_record.team_id;
  END LOOP;
  
  -- Update team rankings
  UPDATE public.challenge_teams ct
  SET team_rank = ranked.rank_position
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY current_score DESC, total_progress DESC, created_at ASC) as rank_position
    FROM public.challenge_teams
    WHERE challenge_id = challenge_id_param
  ) ranked
  WHERE ct.id = ranked.id;
END;
$$;

-- Create trigger to automatically update team scores when participation changes
CREATE OR REPLACE FUNCTION public.trigger_team_score_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  challenge_id_var UUID;
BEGIN
  -- Get challenge_id from the participation record
  IF TG_OP = 'DELETE' THEN
    SELECT pc.id INTO challenge_id_var
    FROM public.private_challenges pc
    JOIN public.private_challenge_participations pcp ON pc.id = pcp.private_challenge_id
    WHERE pcp.id = OLD.id;
  ELSE
    SELECT pc.id INTO challenge_id_var
    FROM public.private_challenges pc
    JOIN public.private_challenge_participations pcp ON pc.id = pcp.private_challenge_id
    WHERE pcp.id = NEW.id;
  END IF;
  
  -- Update team scores if this is a team challenge
  IF challenge_id_var IS NOT NULL THEN
    PERFORM public.update_team_scores(challenge_id_var);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_team_scores_trigger
  AFTER UPDATE OF progress_value, completion_percentage ON public.private_challenge_participations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_team_score_update();