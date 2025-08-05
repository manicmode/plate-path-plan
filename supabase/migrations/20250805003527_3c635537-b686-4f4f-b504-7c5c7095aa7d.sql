-- Final Phase 1 Security Fix: Properly handle view recreations

-- Drop and recreate views to avoid column naming conflicts
DROP VIEW IF EXISTS public.workout_progress_analytics;
DROP VIEW IF EXISTS public.workout_skipping_analysis;

-- Recreate workout_progress_analytics as regular view (not SECURITY DEFINER)
CREATE VIEW public.workout_progress_analytics AS
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
  END as performance_tier
FROM workout_logs wl
LEFT JOIN ai_routines ar ON wl.routine_id = ar.id
WHERE wl.user_id = auth.uid()
  AND wl.completed_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY wl.user_id, ar.routine_name, DATE_TRUNC('week', wl.completed_at)
ORDER BY week_start DESC, routine_name;

-- Recreate workout_skipping_analysis as regular view (not SECURITY DEFINER)
CREATE VIEW public.workout_skipping_analysis AS
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

-- Ensure workout_logs table has proper RLS policies
DO $$
BEGIN
  -- Check if workout_logs table exists and add RLS if needed
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workout_logs') THEN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'workout_logs' 
      AND rowsecurity = true
    ) THEN
      ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Add policy if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'workout_logs' 
      AND policyname = 'Users can view their own workout logs'
    ) THEN
      CREATE POLICY "Users can view their own workout logs" 
      ON public.workout_logs FOR SELECT 
      USING (auth.uid() = user_id);
    END IF;
  END IF;
END
$$;

-- Log successful completion of Phase 1 security fixes
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
  'system_phase1_security_fixes_completed',
  'medium',
  jsonb_build_object(
    'phase', 'critical_database_security_complete',
    'fixes_applied', jsonb_build_array(
      'security_definer_views_converted_to_regular',
      'function_search_paths_secured',
      'enhanced_validation_added',
      'rls_policies_strengthened',
      'security_monitoring_enhanced'
    ),
    'status', 'completed',
    'next_phase', 'security_hardening',
    'timestamp', now()
  ),
  NULL
);