-- Fix the security definer issue by dropping and recreating the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.workout_skipping_analysis;

-- Create the view without SECURITY DEFINER to avoid the security warning
CREATE VIEW public.workout_skipping_analysis AS
SELECT 
  user_id,
  exercise_name,
  exercise_type,
  day_name,
  COUNT(*) as total_workouts,
  AVG(skipped_sets::numeric) as avg_skipped_sets,
  SUM(skipped_sets) as total_skipped_sets,
  MAX(completed_at) as last_workout_date,
  DATE_TRUNC('week', completed_at) as workout_week
FROM public.workout_logs
WHERE completed_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, exercise_name, exercise_type, day_name, DATE_TRUNC('week', completed_at)
ORDER BY workout_week DESC, avg_skipped_sets DESC;

-- Enable RLS on the view if needed (views inherit RLS from underlying tables)
-- No additional RLS needed since workout_logs already has proper RLS policies