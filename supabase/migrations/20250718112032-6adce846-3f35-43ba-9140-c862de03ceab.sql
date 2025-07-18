-- Create yearly_hall_of_fame table
CREATE TABLE public.yearly_hall_of_fame (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  yearly_score NUMERIC NOT NULL DEFAULT 0,
  monthly_trophies INTEGER NOT NULL DEFAULT 0,
  avg_nutrition_streak NUMERIC DEFAULT 0,
  avg_hydration_streak NUMERIC DEFAULT 0,
  avg_supplement_streak NUMERIC DEFAULT 0,
  total_active_days INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.yearly_hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view yearly hall of fame" 
ON public.yearly_hall_of_fame 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert yearly hall of fame" 
ON public.yearly_hall_of_fame 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create get_top_100_yearly_users function
CREATE OR REPLACE FUNCTION public.get_top_100_yearly_users(target_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
RETURNS TABLE(
  user_id UUID,
  username TEXT,
  display_name TEXT,
  yearly_score NUMERIC,
  monthly_trophies INTEGER,
  avg_nutrition_streak NUMERIC,
  avg_hydration_streak NUMERIC,
  avg_supplement_streak NUMERIC,
  total_active_days INTEGER,
  total_messages INTEGER,
  rank_position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH year_bounds AS (
    SELECT 
      (target_year || '-01-01')::DATE as year_start,
      (target_year || '-12-31')::DATE as year_end
  ),
  user_messages AS (
    -- Get total messages and active days from challenges
    SELECT 
      cm.user_id,
      cm.username,
      COUNT(*) as total_messages,
      COUNT(DISTINCT DATE(cm.created_at)) as message_active_days
    FROM public.challenge_messages cm
    CROSS JOIN year_bounds yb
    WHERE DATE(cm.created_at) BETWEEN yb.year_start AND yb.year_end
    GROUP BY cm.user_id, cm.username
  ),
  user_logging_activity AS (
    -- Get active days from nutrition, hydration, supplement logs
    SELECT 
      COALESCE(nl.user_id, hl.user_id, sl.user_id) as user_id,
      COUNT(DISTINCT COALESCE(DATE(nl.created_at), DATE(hl.created_at), DATE(sl.created_at))) as logging_active_days
    FROM year_bounds yb
    FULL OUTER JOIN public.nutrition_logs nl ON DATE(nl.created_at) BETWEEN yb.year_start AND yb.year_end
    FULL OUTER JOIN public.hydration_logs hl ON DATE(hl.created_at) BETWEEN yb.year_start AND yb.year_end
    FULL OUTER JOIN public.supplement_logs sl ON DATE(sl.created_at) BETWEEN yb.year_start AND yb.year_end
    WHERE COALESCE(nl.user_id, hl.user_id, sl.user_id) IS NOT NULL
    GROUP BY COALESCE(nl.user_id, hl.user_id, sl.user_id)
  ),
  monthly_winners AS (
    -- Get monthly 1st place finishes by checking each month
    SELECT 
      user_id,
      COUNT(*) as monthly_trophy_count
    FROM (
      SELECT DISTINCT
        DATE_TRUNC('month', generate_series(
          (target_year || '-01-01')::DATE,
          (target_year || '-12-31')::DATE,
          '1 month'::INTERVAL
        )) as month_start
    ) months
    CROSS JOIN LATERAL (
      -- For each month, get 1st place winners from completed challenges
      SELECT DISTINCT cp.user_id
      FROM public.get_completed_challenges_for_month(month_start::DATE) cc
      CROSS JOIN LATERAL public.get_challenge_podium_winners(cc.challenge_id, month_start::DATE) cp
      WHERE cp.podium_position = 1
    ) winners
    GROUP BY user_id
  ),
  user_profiles_data AS (
    -- Get current streak data and names from profiles
    SELECT 
      up.user_id,
      COALESCE(up.first_name || ' ' || up.last_name, au.email) as display_name,
      COALESCE(up.current_nutrition_streak, 0) as nutrition_streak,
      COALESCE(up.current_hydration_streak, 0) as hydration_streak,
      COALESCE(up.current_supplement_streak, 0) as supplement_streak
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
  ),
  user_yearly_stats AS (
    -- Combine all stats for each user
    SELECT 
      COALESCE(um.user_id, ula.user_id, upd.user_id) as user_id,
      COALESCE(um.username, upd.display_name, 'Unknown') as username,
      COALESCE(upd.display_name, um.username, 'Unknown') as display_name,
      COALESCE(um.total_messages, 0) as total_messages,
      GREATEST(
        COALESCE(um.message_active_days, 0),
        COALESCE(ula.logging_active_days, 0)
      ) as total_active_days,
      COALESCE(mw.monthly_trophy_count, 0) as monthly_trophies,
      COALESCE(upd.nutrition_streak, 0) as avg_nutrition_streak,
      COALESCE(upd.hydration_streak, 0) as avg_hydration_streak,
      COALESCE(upd.supplement_streak, 0) as avg_supplement_streak
    FROM user_messages um
    FULL OUTER JOIN user_logging_activity ula ON um.user_id = ula.user_id
    FULL OUTER JOIN monthly_winners mw ON COALESCE(um.user_id, ula.user_id) = mw.user_id
    FULL OUTER JOIN user_profiles_data upd ON COALESCE(um.user_id, ula.user_id) = upd.user_id
    WHERE COALESCE(um.user_id, ula.user_id, upd.user_id) IS NOT NULL
  ),
  scored_users AS (
    -- Calculate yearly scores and rank
    SELECT 
      *,
      -- Weighted formula: Messages * 1 + Active days * 2 + Monthly wins * 30 + Average streaks * 3
      (
        total_messages * 1.0 +
        total_active_days * 2.0 +
        monthly_trophies * 30.0 +
        ((avg_nutrition_streak + avg_hydration_streak + avg_supplement_streak) / 3.0) * 3.0
      ) as yearly_score
    FROM user_yearly_stats
  ),
  ranked_users AS (
    -- Rank users with tie-breaking
    SELECT 
      *,
      ROW_NUMBER() OVER (
        ORDER BY 
          yearly_score DESC,
          monthly_trophies DESC,
          GREATEST(avg_nutrition_streak, avg_hydration_streak, avg_supplement_streak) DESC,
          total_active_days DESC,
          total_messages DESC
      ) as rank_position
    FROM scored_users
  )
  SELECT 
    ru.user_id,
    ru.username,
    ru.display_name,
    ROUND(ru.yearly_score, 2) as yearly_score,
    ru.monthly_trophies,
    ROUND(ru.avg_nutrition_streak, 1) as avg_nutrition_streak,
    ROUND(ru.avg_hydration_streak, 1) as avg_hydration_streak,
    ROUND(ru.avg_supplement_streak, 1) as avg_supplement_streak,
    ru.total_active_days,
    ru.total_messages,
    ru.rank_position::INTEGER
  FROM ranked_users ru
  WHERE ru.rank_position <= 100
  ORDER BY ru.rank_position;
END;
$function$;