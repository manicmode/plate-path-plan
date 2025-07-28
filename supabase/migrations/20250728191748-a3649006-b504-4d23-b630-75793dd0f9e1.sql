-- Add recovery challenge types to the challenge system
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'recovery_challenge_participant';

-- Create recovery challenge metrics table for monthly rankings
CREATE TABLE IF NOT EXISTS public.recovery_challenge_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month_year DATE NOT NULL,
  meditation_sessions INTEGER DEFAULT 0,
  breathing_sessions INTEGER DEFAULT 0,
  yoga_sessions INTEGER DEFAULT 0,
  sleep_sessions INTEGER DEFAULT 0,
  stretching_sessions INTEGER DEFAULT 0,
  muscle_recovery_sessions INTEGER DEFAULT 0,
  total_recovery_sessions INTEGER DEFAULT 0,
  recovery_streak_bonus NUMERIC DEFAULT 0,
  final_recovery_score NUMERIC DEFAULT 0,
  rank_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recovery_challenge_metrics_user_month ON public.recovery_challenge_metrics(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_recovery_challenge_metrics_month_rank ON public.recovery_challenge_metrics(month_year, rank_position);

-- Enable RLS
ALTER TABLE public.recovery_challenge_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all recovery challenge metrics" 
ON public.recovery_challenge_metrics 
FOR SELECT 
USING (true);

CREATE POLICY "System can create recovery challenge metrics" 
ON public.recovery_challenge_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update recovery challenge metrics" 
ON public.recovery_challenge_metrics 
FOR UPDATE 
USING (true);

-- Add recovery challenge goal types to challenge messages table if not exists
-- (We'll track recovery challenges using the existing challenge_messages system)

-- Create function to calculate recovery score
CREATE OR REPLACE FUNCTION public.calculate_recovery_score(
  meditation_count INTEGER,
  breathing_count INTEGER,
  yoga_count INTEGER,
  sleep_count INTEGER,
  stretching_count INTEGER,
  muscle_recovery_count INTEGER,
  streak_bonus NUMERIC DEFAULT 1.0
) RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    meditation_count * 3 +
    breathing_count * 2 +
    yoga_count * 4 +
    sleep_count * 2 +
    stretching_count * 2 +
    muscle_recovery_count * 3
  ) * streak_bonus;
END;
$$ LANGUAGE plpgsql;

-- Create function to update recovery challenge metrics
CREATE OR REPLACE FUNCTION public.update_recovery_challenge_metrics(target_user_id UUID, target_month_year DATE)
RETURNS VOID AS $$
DECLARE
  meditation_count INTEGER := 0;
  breathing_count INTEGER := 0;
  yoga_count INTEGER := 0;
  sleep_count INTEGER := 0;
  stretching_count INTEGER := 0;
  muscle_recovery_count INTEGER := 0;
  total_sessions INTEGER := 0;
  current_streak INTEGER := 0;
  streak_bonus NUMERIC := 1.0;
  final_score NUMERIC := 0;
BEGIN
  -- Get recovery session counts for the month
  SELECT 
    COUNT(*) FILTER (WHERE category = 'meditation'),
    COUNT(*) FILTER (WHERE category = 'breathing'),
    COUNT(*) FILTER (WHERE category = 'yoga'),
    COUNT(*) FILTER (WHERE category = 'sleep'),
    COUNT(*) FILTER (WHERE category = 'stretching'),
    COUNT(*) FILTER (WHERE category = 'muscle-recovery'),
    COUNT(*)
  INTO 
    meditation_count, breathing_count, yoga_count, sleep_count, 
    stretching_count, muscle_recovery_count, total_sessions
  FROM public.recovery_session_logs
  WHERE user_id = target_user_id
    AND DATE_TRUNC('month', completed_at) = target_month_year;

  -- Get best current streak from any recovery type
  SELECT GREATEST(
    COALESCE((SELECT current_streak FROM public.meditation_streaks WHERE user_id = target_user_id), 0),
    COALESCE((SELECT current_streak FROM public.breathing_streaks WHERE user_id = target_user_id), 0),
    COALESCE((SELECT current_streak FROM public.yoga_streaks WHERE user_id = target_user_id), 0),
    COALESCE((SELECT current_streak FROM public.sleep_streaks WHERE user_id = target_user_id), 0)
  ) INTO current_streak;

  -- Calculate streak bonus (1.0 to 2.0 based on streak)
  streak_bonus := 1.0 + LEAST(current_streak * 0.1, 1.0);

  -- Calculate final score
  final_score := public.calculate_recovery_score(
    meditation_count, breathing_count, yoga_count, sleep_count, 
    stretching_count, muscle_recovery_count, streak_bonus
  );

  -- Insert or update metrics
  INSERT INTO public.recovery_challenge_metrics (
    user_id, month_year, meditation_sessions, breathing_sessions, yoga_sessions,
    sleep_sessions, stretching_sessions, muscle_recovery_sessions,
    total_recovery_sessions, recovery_streak_bonus, final_recovery_score
  ) VALUES (
    target_user_id, target_month_year, meditation_count, breathing_count, yoga_count,
    sleep_count, stretching_count, muscle_recovery_count,
    total_sessions, streak_bonus, final_score
  )
  ON CONFLICT (user_id, month_year) 
  DO UPDATE SET
    meditation_sessions = EXCLUDED.meditation_sessions,
    breathing_sessions = EXCLUDED.breathing_sessions,
    yoga_sessions = EXCLUDED.yoga_sessions,
    sleep_sessions = EXCLUDED.sleep_sessions,
    stretching_sessions = EXCLUDED.stretching_sessions,
    muscle_recovery_sessions = EXCLUDED.muscle_recovery_sessions,
    total_recovery_sessions = EXCLUDED.total_recovery_sessions,
    recovery_streak_bonus = EXCLUDED.recovery_streak_bonus,
    final_recovery_score = EXCLUDED.final_recovery_score,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint for user_id and month_year
ALTER TABLE public.recovery_challenge_metrics 
ADD CONSTRAINT unique_user_month_recovery UNIQUE (user_id, month_year);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_recovery_challenge_metrics_updated_at
  BEFORE UPDATE ON public.recovery_challenge_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Assign monthly recovery rankings function
CREATE OR REPLACE FUNCTION public.assign_monthly_recovery_rankings(target_month_year DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'))
RETURNS VOID AS $$
DECLARE
  user_record RECORD;
  rank_position INTEGER := 1;
BEGIN
  -- Update all users' recovery metrics for the target month
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.recovery_session_logs 
    WHERE DATE_TRUNC('month', completed_at) = target_month_year
  LOOP
    PERFORM public.update_recovery_challenge_metrics(user_record.user_id, target_month_year);
  END LOOP;

  -- Assign rankings based on final scores
  WITH ranked_users AS (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY final_recovery_score DESC, total_recovery_sessions DESC) as rank
    FROM public.recovery_challenge_metrics
    WHERE month_year = target_month_year
      AND final_recovery_score > 0
  )
  UPDATE public.recovery_challenge_metrics
  SET rank_position = ranked_users.rank
  FROM ranked_users
  WHERE recovery_challenge_metrics.user_id = ranked_users.user_id
    AND recovery_challenge_metrics.month_year = target_month_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;