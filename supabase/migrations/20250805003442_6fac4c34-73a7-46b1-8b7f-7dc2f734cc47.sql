-- Final Phase 1 Security Fix: Remove any remaining Security Definer properties from system objects

-- Check and recreate any remaining problematic views
-- Ensure all analytics views are properly secured with RLS instead of SECURITY DEFINER

-- Recreate workout_progress_analytics without SECURITY DEFINER
CREATE OR REPLACE VIEW public.workout_progress_analytics AS
SELECT 
  wl.user_id,
  ar.routine_name,
  COUNT(*) as total_sessions,
  AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) * 100 as avg_completion_rate,
  DATE_TRUNC('week', wl.completed_at) as week_start,
  CASE 
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.9 THEN 'excellent'
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.75 THEN 'good'
    WHEN AVG(wl.sets_completed::float / NULLIF(wl.target_sets, 0)::float) >= 0.6 THEN 'fair'
    ELSE 'needs_improvement'
  END as performance_grade
FROM workout_logs wl
LEFT JOIN ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid()
  AND wl.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY wl.user_id, ar.routine_name, DATE_TRUNC('week', wl.completed_at)
ORDER BY week_start DESC, routine_name;

-- Recreate workout_skipping_analysis without SECURITY DEFINER
CREATE OR REPLACE VIEW public.workout_skipping_analysis AS
SELECT 
  user_id,
  COUNT(*) as total_workouts,
  AVG(skipped_sets) as avg_skipped_sets,
  AVG(sets_completed::float / NULLIF(target_sets, 0)::float) * 100 as avg_completion_rate,
  COUNT(CASE WHEN skipped_sets > 0 THEN 1 END) as workouts_with_skips,
  COUNT(CASE WHEN sets_completed = target_sets THEN 1 END) as perfect_workouts,
  DATE_TRUNC('month', completed_at) as month_year
FROM workout_logs
WHERE user_id = auth.uid()
  AND completed_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY user_id, DATE_TRUNC('month', completed_at)
ORDER BY month_year DESC;

-- Add enhanced RLS policies to ensure proper access control
-- These replace the need for SECURITY DEFINER views

-- Ensure workout_logs has proper RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'workout_logs' 
    AND policyname = 'Users can view their own workout logs'
  ) THEN
    CREATE POLICY "Users can view their own workout logs" 
    ON workout_logs FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Final security event log
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
  'system_security_definer_views_remediated',
  'low',
  jsonb_build_object(
    'phase', 'final_security_definer_cleanup',
    'action', 'converted_remaining_views_to_regular',
    'views_updated', jsonb_build_array(
      'workout_progress_analytics',
      'workout_skipping_analysis'
    ),
    'security_posture', 'enhanced',
    'timestamp', now()
  ),
  NULL
);