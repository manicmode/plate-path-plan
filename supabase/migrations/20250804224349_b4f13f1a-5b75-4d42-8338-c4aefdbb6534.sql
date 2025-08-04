-- Add skipped sets tracking to workout_logs table
ALTER TABLE public.workout_logs 
ADD COLUMN skipped_sets INTEGER NOT NULL DEFAULT 0;

-- Add optional reasons for future use
ALTER TABLE public.workout_logs 
ADD COLUMN skipped_set_reasons TEXT[] DEFAULT '{}';

-- Create an index for performance on skipped_sets
CREATE INDEX idx_workout_logs_skipped_sets ON public.workout_logs(skipped_sets, completed_at);

-- Add sample data to test with
UPDATE public.workout_logs 
SET skipped_sets = FLOOR(RANDOM() * 3) 
WHERE user_id = '8589c22a-00f5-4e42-a197-fe0dbd87a5d8' 
AND completed_at >= NOW() - INTERVAL '7 days';

-- Create a view for workout adaptation analysis
CREATE OR REPLACE VIEW public.workout_skipping_analysis AS
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