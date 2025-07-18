-- Create function to get top 3 performers from completed challenges
CREATE OR REPLACE FUNCTION public.get_challenge_podium_winners(
  challenge_id_param text,
  month_year date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  final_score numeric,
  final_streak integer,
  completion_date timestamp with time zone,
  position integer,
  total_interactions integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH challenge_participants AS (
    -- Get all participants in the challenge with their performance metrics
    SELECT DISTINCT
      cm.user_id,
      cm.username,
      COUNT(DISTINCT cm.id) as total_messages,
      COUNT(DISTINCT DATE(cm.created_at)) as active_days,
      MAX(cm.created_at) as last_activity,
      -- Calculate a composite score based on activity and engagement
      (COUNT(DISTINCT cm.id) * 1.0) + 
      (COUNT(DISTINCT DATE(cm.created_at)) * 5.0) +
      (CASE WHEN MAX(cm.created_at) >= NOW() - INTERVAL '7 days' THEN 10.0 ELSE 0.0 END) as activity_score
    FROM public.challenge_messages cm
    WHERE cm.challenge_id = challenge_id_param
      AND DATE_TRUNC('month', cm.created_at) = DATE_TRUNC('month', month_year)
    GROUP BY cm.user_id, cm.username
  ),
  user_performance AS (
    -- Get user streaks and performance data
    SELECT 
      cp.user_id,
      cp.username,
      COALESCE(up.first_name || ' ' || up.last_name, cp.username) as display_name,
      cp.activity_score as final_score,
      COALESCE(
        GREATEST(
          up.current_nutrition_streak, 
          up.current_hydration_streak, 
          up.current_supplement_streak
        ), 0
      ) as streak_value,
      cp.last_activity as completion_date,
      cp.total_messages as total_interactions
    FROM challenge_participants cp
    LEFT JOIN public.user_profiles up ON cp.user_id = up.user_id
  ),
  ranked_performers AS (
    -- Rank performers by score and streak, with tie-breaking by earliest completion
    SELECT 
      *,
      ROW_NUMBER() OVER (
        ORDER BY 
          final_score DESC, 
          streak_value DESC, 
          completion_date ASC,
          total_interactions DESC
      ) as rank_position
    FROM user_performance
  )
  SELECT 
    rp.user_id,
    rp.username,
    rp.display_name,
    rp.final_score,
    rp.streak_value::integer as final_streak,
    rp.completion_date,
    rp.rank_position::integer as position,
    rp.total_interactions::integer
  FROM ranked_performers rp
  WHERE rp.rank_position <= 3
  ORDER BY rp.rank_position;
END;
$$;

-- Create function to get completed challenges for a given month
CREATE OR REPLACE FUNCTION public.get_completed_challenges_for_month(
  target_month date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  challenge_id text,
  challenge_name text,
  participant_count bigint,
  completion_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH challenge_activity AS (
    SELECT 
      cm.challenge_id,
      COUNT(DISTINCT cm.user_id) as participant_count,
      MAX(cm.created_at) as last_activity,
      MIN(cm.created_at) as first_activity
    FROM public.challenge_messages cm
    WHERE DATE_TRUNC('month', cm.created_at) = DATE_TRUNC('month', target_month)
    GROUP BY cm.challenge_id
    HAVING COUNT(DISTINCT cm.user_id) >= 2 -- At least 2 participants for a valid challenge
  )
  SELECT 
    ca.challenge_id,
    ca.challenge_id as challenge_name, -- Using challenge_id as name for now
    ca.participant_count,
    ca.last_activity as completion_date
  FROM challenge_activity ca
  -- Only include challenges that had activity ending in the target month
  WHERE DATE_TRUNC('month', ca.last_activity) = DATE_TRUNC('month', target_month)
  ORDER BY ca.last_activity DESC;
END;
$$;