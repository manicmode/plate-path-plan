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
  categories TEXT[];
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
  SELECT ARRAY_AGG(category ORDER BY frequency DESC) INTO categories
  FROM (
    SELECT 
      CASE 
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%squat%', '%leg%', '%lunge%']) THEN 'legs'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%bench%', '%press%', '%push%']) THEN 'chest'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%pull%', '%row%', '%lat%']) THEN 'back'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%shoulder%', '%lateral%', '%overhead%']) THEN 'shoulders'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%curl%', '%bicep%']) THEN 'arms'
        ELSE 'general'
      END as category,
      COUNT(*) as frequency
    FROM public.workout_logs 
    WHERE user_id = target_user_id 
      AND created_at >= NOW() - INTERVAL '8 weeks'
      AND CASE 
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%squat%', '%leg%', '%lunge%']) THEN 'legs'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%bench%', '%press%', '%push%']) THEN 'chest'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%pull%', '%row%', '%lat%']) THEN 'back'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%shoulder%', '%lateral%', '%overhead%']) THEN 'shoulders'
        WHEN LOWER(exercise_name) LIKE ANY(ARRAY['%curl%', '%bicep%']) THEN 'arms'
        ELSE 'general'
      END != 'general'
    GROUP BY 1
    ORDER BY frequency DESC
    LIMIT 3
  ) ranked_categories;
  
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
    COALESCE(categories, ARRAY['general'::TEXT])::TEXT[];
END;
$function$;