-- Function to get potential accountability buddies based on completed challenges
CREATE OR REPLACE FUNCTION public.get_potential_accountability_buddies(current_user_id uuid)
RETURNS TABLE(
  buddy_user_id uuid,
  buddy_name text,
  buddy_email text,
  challenge_name text,
  challenge_id text,
  completion_date timestamp with time zone,
  shared_ranking_group boolean,
  buddy_rank_position integer,
  current_user_rank_position integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_challenge_completions AS (
    -- Get recent challenge completions for current user (last 7 days)
    SELECT DISTINCT 
      cm.challenge_id,
      cm.challenge_id as challenge_name, -- Using challenge_id as name for now
      MAX(cm.created_at) as completion_date
    FROM public.challenge_messages cm
    WHERE cm.user_id = current_user_id
      AND cm.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY cm.challenge_id
    HAVING COUNT(DISTINCT DATE(cm.created_at)) >= 5 -- Completed at least 5 days
  ),
  other_users_completions AS (
    -- Get other users who completed the same challenges
    SELECT DISTINCT
      cm.user_id as buddy_id,
      cm.challenge_id,
      cm.username as buddy_username,
      MAX(cm.created_at) as buddy_completion_date
    FROM public.challenge_messages cm
    INNER JOIN user_challenge_completions ucc ON cm.challenge_id = ucc.challenge_id
    WHERE cm.user_id != current_user_id
      AND cm.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY cm.user_id, cm.challenge_id, cm.username
    HAVING COUNT(DISTINCT DATE(cm.created_at)) >= 5 -- They also completed at least 5 days
  ),
  user_rankings AS (
    -- Get current user's rank in yearly scores
    SELECT rank_position as current_rank
    FROM public.yearly_score_preview
    WHERE user_id = current_user_id
    ORDER BY last_updated DESC
    LIMIT 1
  ),
  buddy_rankings AS (
    -- Get buddy rankings
    SELECT 
      ouc.buddy_id,
      ysp.rank_position as buddy_rank
    FROM other_users_completions ouc
    LEFT JOIN public.yearly_score_preview ysp ON ouc.buddy_id = ysp.user_id
  )
  SELECT DISTINCT
    ouc.buddy_id as buddy_user_id,
    COALESCE(up.first_name || ' ' || up.last_name, ouc.buddy_username) as buddy_name,
    au.email as buddy_email,
    ouc.challenge_id as challenge_name,
    ouc.challenge_id,
    GREATEST(ucc.completion_date, ouc.buddy_completion_date) as completion_date,
    -- Consider same ranking group if within 50 positions of each other
    CASE 
      WHEN ABS(COALESCE(br.buddy_rank, 999) - COALESCE(ur.current_rank, 999)) <= 50 
      THEN true 
      ELSE false 
    END as shared_ranking_group,
    COALESCE(br.buddy_rank, 999) as buddy_rank_position,
    COALESCE(ur.current_rank, 999) as current_user_rank_position
  FROM other_users_completions ouc
  INNER JOIN user_challenge_completions ucc ON ouc.challenge_id = ucc.challenge_id
  CROSS JOIN user_rankings ur
  LEFT JOIN buddy_rankings br ON ouc.buddy_id = br.buddy_id
  LEFT JOIN public.user_profiles up ON ouc.buddy_id = up.user_id
  LEFT JOIN auth.users au ON ouc.buddy_id = au.id
  WHERE 
    -- Exclude users who are already friends
    NOT EXISTS (
      SELECT 1 FROM public.user_friends uf 
      WHERE (uf.user_id = current_user_id AND uf.friend_id = ouc.buddy_id)
         OR (uf.user_id = ouc.buddy_id AND uf.friend_id = current_user_id)
    )
    -- Only show recent completions (within last 3 days)
    AND GREATEST(ucc.completion_date, ouc.buddy_completion_date) >= NOW() - INTERVAL '3 days'
  ORDER BY 
    shared_ranking_group DESC,
    completion_date DESC,
    ABS(COALESCE(br.buddy_rank, 999) - COALESCE(ur.current_rank, 999)) ASC
  LIMIT 5;
END;
$$;

-- Function to mark a team-up prompt as shown to avoid repeating
CREATE TABLE IF NOT EXISTS public.team_up_prompts_shown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buddy_user_id uuid NOT NULL,
  challenge_id text NOT NULL,
  shown_at timestamp with time zone NOT NULL DEFAULT now(),
  action_taken text, -- 'friend_request_sent', 'dismissed', null
  UNIQUE(user_id, buddy_user_id, challenge_id)
);

-- Enable RLS on team_up_prompts_shown
ALTER TABLE public.team_up_prompts_shown ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_up_prompts_shown
CREATE POLICY "Users can manage their own team-up prompts"
ON public.team_up_prompts_shown
FOR ALL
USING (auth.uid() = user_id);

-- Function to record team-up prompt action
CREATE OR REPLACE FUNCTION public.record_team_up_prompt_action(
  buddy_user_id_param uuid,
  challenge_id_param text,
  action_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.team_up_prompts_shown (user_id, buddy_user_id, challenge_id, action_taken)
  VALUES (auth.uid(), buddy_user_id_param, challenge_id_param, action_param)
  ON CONFLICT (user_id, buddy_user_id, challenge_id) 
  DO UPDATE SET action_taken = action_param, shown_at = now();
  
  RETURN true;
END;
$$;