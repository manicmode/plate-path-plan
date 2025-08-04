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
    AND week_rank <= 4;
  
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
        WHEN growth_trend > 5 THEN i * 2
        WHEN growth_trend < -5 THEN i * -1.5
        ELSE i * 0.5
      END)::NUMERIC as pred_completion,
      (avg_skip_rate * (1 - (i * 0.1)))::NUMERIC as pred_skips,
      (consistency_score - (i * 2))::NUMERIC as confidence,
      CASE 
        WHEN growth_trend > 5 THEN 'improving'
        WHEN growth_trend < -5 THEN 'declining'
        ELSE 'stable'
      END::TEXT as direction;
  END LOOP;
END;
$function$;