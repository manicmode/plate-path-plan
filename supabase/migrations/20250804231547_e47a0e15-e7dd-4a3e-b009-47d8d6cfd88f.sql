-- Create muscle group trends view for comprehensive analytics
CREATE OR REPLACE VIEW public.muscle_group_trends AS
WITH weekly_muscle_data AS (
  SELECT 
    wc.user_id,
    DATE_TRUNC('week', wc.completed_at) as week_start,
    UNNEST(wc.muscles_worked) as muscle_group,
    wc.sets_count as completed_sets_count,
    wc.sets_count as total_sets_count,
    0 as skipped_steps_count, -- Default to 0 since not available in this table
    ARRAY[wc.workout_type] as exercise_names
  FROM public.workout_completions wc
  WHERE wc.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
),
muscle_stats AS (
  SELECT 
    user_id,
    muscle_group,
    week_start,
    SUM(completed_sets_count) as total_completed_sets,
    SUM(total_sets_count) as total_planned_sets,
    SUM(skipped_steps_count) as total_skipped_sets,
    ARRAY_AGG(DISTINCT exercise_names) as all_exercises,
    COUNT(*) as workout_sessions
  FROM weekly_muscle_data
  GROUP BY user_id, muscle_group, week_start
),
muscle_completion_rates AS (
  SELECT 
    user_id,
    muscle_group,
    week_start,
    total_completed_sets,
    total_planned_sets,
    total_skipped_sets,
    workout_sessions,
    all_exercises,
    CASE 
      WHEN total_planned_sets > 0 THEN 
        ROUND((total_completed_sets::numeric / total_planned_sets::numeric) * 100, 1)
      ELSE 100 
    END as completion_rate,
    CASE 
      WHEN total_planned_sets > 0 THEN 
        ROUND((total_skipped_sets::numeric / total_planned_sets::numeric) * 100, 1)
      ELSE 0 
    END as skip_rate
  FROM muscle_stats
),
trend_calculations AS (
  SELECT 
    user_id,
    muscle_group,
    week_start,
    total_completed_sets,
    total_planned_sets,
    total_skipped_sets,
    completion_rate,
    skip_rate,
    workout_sessions,
    all_exercises,
    LAG(completion_rate) OVER (
      PARTITION BY user_id, muscle_group 
      ORDER BY week_start
    ) as prev_completion_rate,
    LAG(total_completed_sets) OVER (
      PARTITION BY user_id, muscle_group 
      ORDER BY week_start
    ) as prev_completed_sets
  FROM muscle_completion_rates
),
common_exercises AS (
  SELECT 
    user_id,
    muscle_group,
    UNNEST(ARRAY_AGG(DISTINCT UNNEST(all_exercises))) as exercise_name,
    COUNT(*) as exercise_frequency
  FROM muscle_completion_rates
  GROUP BY user_id, muscle_group, UNNEST(ARRAY_AGG(DISTINCT UNNEST(all_exercises)))
),
top_exercises AS (
  SELECT 
    user_id,
    muscle_group,
    ARRAY_AGG(exercise_name ORDER BY exercise_frequency DESC) as common_exercises_list
  FROM (
    SELECT 
      user_id,
      muscle_group,
      exercise_name,
      exercise_frequency,
      ROW_NUMBER() OVER (PARTITION BY user_id, muscle_group ORDER BY exercise_frequency DESC) as rn
    FROM common_exercises
  ) ranked_exercises
  WHERE rn <= 3
  GROUP BY user_id, muscle_group
)
SELECT 
  tc.user_id,
  tc.muscle_group,
  tc.week_start,
  tc.total_completed_sets,
  tc.total_planned_sets,
  tc.total_skipped_sets,
  tc.completion_rate,
  tc.skip_rate,
  tc.workout_sessions,
  COALESCE(te.common_exercises_list, '{}') as most_common_exercises,
  CASE 
    WHEN tc.prev_completion_rate IS NOT NULL THEN 
      tc.completion_rate - tc.prev_completion_rate
    ELSE 0 
  END as completion_rate_change,
  CASE 
    WHEN tc.prev_completed_sets IS NOT NULL THEN 
      tc.total_completed_sets - tc.prev_completed_sets
    ELSE 0 
  END as sets_change,
  CASE 
    WHEN tc.completion_rate >= 85 THEN 'excellent'
    WHEN tc.completion_rate >= 70 THEN 'good'
    WHEN tc.completion_rate >= 50 THEN 'fair'
    ELSE 'needs_work'
  END as consistency_badge,
  CASE 
    WHEN tc.completion_rate - tc.prev_completion_rate > 10 THEN 'improving'
    WHEN tc.completion_rate - tc.prev_completion_rate < -10 THEN 'declining'
    ELSE 'stable'
  END as trend_direction
FROM trend_calculations tc
LEFT JOIN top_exercises te ON tc.user_id = te.user_id AND tc.muscle_group = te.muscle_group
ORDER BY tc.user_id, tc.muscle_group, tc.week_start DESC;