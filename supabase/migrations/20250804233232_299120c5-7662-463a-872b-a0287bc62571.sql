-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS public.workout_skipping_analysis;
DROP VIEW IF EXISTS public.workout_progress_analytics;
DROP VIEW IF EXISTS public.muscle_group_trends;

-- Recreate workout_skipping_analysis with proper user filtering
CREATE OR REPLACE VIEW public.workout_skipping_analysis AS
SELECT 
  wl.user_id,
  COUNT(*) as total_workouts,
  AVG(wl.skipped_steps_count) as avg_skipped_steps,
  AVG(wl.completed_exercises_count::float / NULLIF(wl.total_exercises_count, 0)) * 100 as completion_rate,
  COUNT(CASE WHEN wl.skipped_steps_count > 2 THEN 1 END)::float / COUNT(*) * 100 as high_skip_rate,
  DATE_TRUNC('week', wl.completed_at) as week_start
FROM public.workout_logs wl
WHERE wl.user_id = auth.uid()
  AND wl.completed_at >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY wl.user_id, DATE_TRUNC('week', wl.completed_at)
ORDER BY week_start DESC;

-- Recreate workout_progress_analytics with proper user filtering
CREATE OR REPLACE VIEW public.workout_progress_analytics AS
SELECT 
  wl.user_id,
  ar.routine_name,
  COUNT(*) as total_sessions,
  AVG(wl.performance_score) as avg_performance,
  AVG(wl.completed_exercises_count::float / NULLIF(wl.total_exercises_count, 0)) * 100 as avg_completion_rate,
  DATE_TRUNC('week', wl.completed_at) as week_start,
  CASE 
    WHEN AVG(wl.performance_score) >= 80 THEN 'excellent'
    WHEN AVG(wl.performance_score) >= 65 THEN 'good'
    WHEN AVG(wl.performance_score) >= 50 THEN 'fair'
    ELSE 'needs_improvement'
  END as performance_tier
FROM public.workout_logs wl
LEFT JOIN public.ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid()
  AND ar.user_id = auth.uid()
  AND wl.completed_at >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY wl.user_id, ar.routine_name, DATE_TRUNC('week', wl.completed_at)
ORDER BY week_start DESC;

-- Recreate muscle_group_trends with proper user filtering
CREATE OR REPLACE VIEW public.muscle_group_trends AS
WITH muscle_categories AS (
  SELECT 
    wl.user_id,
    CASE 
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%squat%', '%lunge%', '%leg%', '%quad%', '%hamstring%', '%calf%']) THEN 'legs'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%chest%', '%bench%', '%push up%', '%pec%']) THEN 'chest'  
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%back%', '%row%', '%pull%', '%lat%', '%deadlift%']) THEN 'back'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%shoulder%', '%press%', '%raise%', '%delt%']) THEN 'shoulders'
      WHEN wl.exercise_name ILIKE ANY(ARRAY['%arm%', '%bicep%', '%tricep%', '%curl%']) THEN 'arms'
      ELSE 'other'
    END as muscle_group,
    wl.exercise_name,
    wl.completed_sets_count,
    wl.skipped_steps_count,
    DATE_TRUNC('week', wl.completed_at) as week_start,
    wl.completed_at
  FROM public.workout_logs wl
  WHERE wl.user_id = auth.uid()
    AND wl.completed_at >= CURRENT_DATE - INTERVAL '8 weeks'
),
weekly_stats AS (
  SELECT 
    user_id,
    muscle_group,
    week_start,
    SUM(completed_sets_count) as total_sets,
    COUNT(*) as total_exercises,
    SUM(skipped_steps_count) as total_skipped,
    AVG(completed_sets_count) as avg_sets_per_exercise,
    COUNT(DISTINCT exercise_name) as unique_exercises
  FROM muscle_categories
  WHERE muscle_group != 'other'
  GROUP BY user_id, muscle_group, week_start
),
top_exercises AS (
  SELECT 
    user_id,
    muscle_group,
    exercise_name,
    COUNT(*) as frequency,
    ROW_NUMBER() OVER (PARTITION BY user_id, muscle_group ORDER BY COUNT(*) DESC) as exercise_rank
  FROM muscle_categories
  WHERE muscle_group != 'other'
  GROUP BY user_id, muscle_group, exercise_name
)
SELECT 
  ws.user_id,
  ws.muscle_group,
  ws.week_start,
  ws.total_sets,
  ws.total_exercises,
  ws.total_skipped,
  ws.avg_sets_per_exercise,
  ws.unique_exercises,
  ROUND((ws.total_sets::float / NULLIF(ws.total_sets + ws.total_skipped, 0)) * 100, 1) as completion_rate,
  ROUND((ws.total_skipped::float / NULLIF(ws.total_sets + ws.total_skipped, 0)) * 100, 1) as skip_rate,
  LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) as prev_week_sets,
  CASE 
    WHEN LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) IS NULL THEN 'stable'
    WHEN ws.total_sets > LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'increasing'
    WHEN ws.total_sets < LAG(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'decreasing'
    ELSE 'stable'
  END as trend_direction,
  ARRAY_AGG(te.exercise_name ORDER BY te.frequency DESC) FILTER (WHERE te.exercise_rank <= 3) as top_exercises
FROM weekly_stats ws
LEFT JOIN top_exercises te ON ws.user_id = te.user_id AND ws.muscle_group = te.muscle_group
WHERE ws.user_id = auth.uid()
GROUP BY ws.user_id, ws.muscle_group, ws.week_start, ws.total_sets, ws.total_exercises, ws.total_skipped, ws.avg_sets_per_exercise, ws.unique_exercises
ORDER BY ws.muscle_group, ws.week_start DESC;