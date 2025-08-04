-- Create workout progress analytics view
CREATE OR REPLACE VIEW public.workout_progress_analytics AS
WITH weekly_stats AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', created_at) as week_start,
    COUNT(*) as total_workouts,
    SUM(sets_completed) as total_sets_completed,
    SUM(target_sets) as total_sets_planned,
    SUM(skipped_sets) as total_skipped_sets,
    AVG(duration_seconds / 60.0) as avg_duration_minutes,
    ARRAY_AGG(DISTINCT exercise_name) as exercises_done,
    COUNT(DISTINCT DATE(created_at)) as workout_days
  FROM public.workout_logs
  WHERE created_at >= NOW() - INTERVAL '12 weeks'
  GROUP BY user_id, DATE_TRUNC('week', created_at)
),
user_trends AS (
  SELECT 
    user_id,
    week_start,
    total_workouts,
    total_sets_completed,
    total_sets_planned,
    total_skipped_sets,
    workout_days,
    avg_duration_minutes,
    CASE 
      WHEN total_sets_planned > 0 
      THEN (total_sets_completed::NUMERIC / total_sets_planned::NUMERIC) * 100 
      ELSE 0 
    END as completion_rate,
    CASE 
      WHEN total_sets_planned > 0 
      THEN (total_skipped_sets::NUMERIC / total_sets_planned::NUMERIC) * 100 
      ELSE 0 
    END as skip_rate,
    -- Calculate week-over-week growth
    LAG(total_workouts) OVER (PARTITION BY user_id ORDER BY week_start) as prev_week_workouts,
    LAG(total_sets_completed) OVER (PARTITION BY user_id ORDER BY week_start) as prev_week_sets,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY week_start DESC) as week_rank
  FROM weekly_stats
)
SELECT 
  user_id,
  week_start,
  total_workouts,
  total_sets_completed,
  total_sets_planned,
  total_skipped_sets,
  workout_days,
  avg_duration_minutes,
  completion_rate,
  skip_rate,
  week_rank,
  -- Growth calculations
  CASE 
    WHEN prev_week_workouts > 0 
    THEN ((total_workouts - prev_week_workouts)::NUMERIC / prev_week_workouts::NUMERIC) * 100 
    ELSE 0 
  END as workout_growth_rate,
  CASE 
    WHEN prev_week_sets > 0 
    THEN ((total_sets_completed - prev_week_sets)::NUMERIC / prev_week_sets::NUMERIC) * 100 
    ELSE 0 
  END as sets_growth_rate
FROM user_trends
WHERE week_rank <= 8  -- Last 8 weeks
ORDER BY user_id, week_start DESC;

-- Create workout forecast predictions function
CREATE OR REPLACE FUNCTION public.calculate_workout_forecast(target_user_id UUID)
RETURNS TABLE(
  forecast_week INTEGER,
  predicted_workouts NUMERIC,
  predicted_completion_rate NUMERIC,
  predicted_skipped_sets NUMERIC,
  confidence_score NUMERIC,
  trend_direction TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recent_weeks RECORD;
  avg_workouts NUMERIC;
  avg_completion_rate NUMERIC;
  avg_skip_rate NUMERIC;
  growth_trend NUMERIC;
  consistency_score NUMERIC;
BEGIN
  -- Get recent performance metrics
  SELECT 
    AVG(total_workouts) as avg_weekly_workouts,
    AVG(completion_rate) as avg_completion,
    AVG(skip_rate) as avg_skip,
    AVG(workout_growth_rate) as trend,
    STDDEV(total_workouts) as workout_variance
  INTO recent_weeks
  FROM public.workout_progress_analytics 
  WHERE user_id = target_user_id 
    AND week_rank <= 4; -- Last 4 weeks
  
  -- Set defaults if no data
  avg_workouts := COALESCE(recent_weeks.avg_weekly_workouts, 3);
  avg_completion_rate := COALESCE(recent_weeks.avg_completion, 75);
  avg_skip_rate := COALESCE(recent_weeks.avg_skip, 15);
  growth_trend := COALESCE(recent_weeks.trend, 0);
  
  -- Calculate confidence based on data consistency
  consistency_score := CASE 
    WHEN recent_weeks.workout_variance IS NULL OR recent_weeks.workout_variance = 0 THEN 70
    WHEN recent_weeks.workout_variance < 1 THEN 85
    WHEN recent_weeks.workout_variance < 2 THEN 75
    ELSE 60
  END;
  
  -- Generate 4-week forecast
  FOR i IN 1..4 LOOP
    RETURN QUERY SELECT
      i::INTEGER,
      (avg_workouts + (growth_trend * i * 0.1))::NUMERIC as pred_workouts,
      (avg_completion_rate + CASE 
        WHEN growth_trend > 5 THEN i * 2  -- Improving trend
        WHEN growth_trend < -5 THEN i * -1.5  -- Declining trend
        ELSE i * 0.5  -- Stable trend
      END)::NUMERIC as pred_completion,
      (avg_skip_rate * (1 - (i * 0.1)))::NUMERIC as pred_skips,  -- Assume gradual improvement
      (consistency_score - (i * 2))::NUMERIC as confidence,  -- Decreasing confidence over time
      CASE 
        WHEN growth_trend > 5 THEN 'improving'
        WHEN growth_trend < -5 THEN 'declining'
        ELSE 'stable'
      END::TEXT as direction;
  END LOOP;
END;
$function$;

-- Create workout trends summary function
CREATE OR REPLACE FUNCTION public.get_workout_trends_summary(target_user_id UUID)
RETURNS TABLE(
  total_weeks_analyzed INTEGER,
  avg_weekly_workouts NUMERIC,
  overall_completion_rate NUMERIC,
  overall_skip_rate NUMERIC,
  trend_direction TEXT,
  consistency_rating TEXT,
  top_exercise_categories TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trends_data RECORD;
  consistency TEXT;
BEGIN
  -- Analyze workout trends
  SELECT 
    COUNT(*) as weeks_count,
    AVG(total_workouts) as avg_workouts,
    AVG(completion_rate) as avg_completion,
    AVG(skip_rate) as avg_skip,
    AVG(workout_growth_rate) as growth_trend,
    STDDEV(total_workouts) as variance
  INTO trends_data
  FROM public.workout_progress_analytics 
  WHERE user_id = target_user_id 
    AND week_rank <= 8;
  
  -- Determine consistency rating
  consistency := CASE 
    WHEN trends_data.variance IS NULL OR trends_data.variance < 1 THEN 'excellent'
    WHEN trends_data.variance < 2 THEN 'good'
    WHEN trends_data.variance < 3 THEN 'moderate'
    ELSE 'inconsistent'
  END;
  
  -- Get top exercise categories
  WITH exercise_categories AS (
    SELECT 
      CASE 
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%squat%', '%leg%', '%lunge%']) THEN 'legs'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%bench%', '%press%', '%push%']) THEN 'chest'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%pull%', '%row%', '%lat%']) THEN 'back'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%shoulder%', '%lateral%', '%overhead%']) THEN 'shoulders'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%curl%', '%bicep%']) THEN 'arms'
        ELSE 'other'
      END as category,
      COUNT(*) as frequency
    FROM public.workout_logs 
    WHERE user_id = target_user_id 
      AND created_at >= NOW() - INTERVAL '8 weeks'
    GROUP BY 1
    ORDER BY frequency DESC
    LIMIT 3
  )
  
  RETURN QUERY SELECT
    COALESCE(trends_data.weeks_count, 0)::INTEGER,
    COALESCE(trends_data.avg_workouts, 0)::NUMERIC,
    COALESCE(trends_data.avg_completion, 0)::NUMERIC,
    COALESCE(trends_data.avg_skip, 0)::NUMERIC,
    CASE 
      WHEN trends_data.growth_trend > 5 THEN 'improving'
      WHEN trends_data.growth_trend < -5 THEN 'declining'
      ELSE 'stable'
    END::TEXT,
    consistency::TEXT,
    ARRAY(SELECT category FROM exercise_categories WHERE category != 'other')::TEXT[];
END;
$function$;