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
WHERE week_rank <= 8
ORDER BY user_id, week_start DESC;