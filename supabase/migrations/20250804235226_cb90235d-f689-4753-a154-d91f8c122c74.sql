-- =============================================================================
-- FINAL SECURITY FIXES - Remove All SECURITY DEFINER Views
-- =============================================================================

-- Fix 1: Find all views with SECURITY DEFINER and recreate them properly
-- First, let's check what views exist and contain SECURITY DEFINER
DO $$
DECLARE
    rec RECORD;
    view_sql TEXT;
BEGIN
    -- Find all views that might have SECURITY DEFINER
    FOR rec IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Get the view definition
        SELECT pg_get_viewdef(pg_class.oid) INTO view_sql
        FROM pg_class 
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE pg_class.relname = rec.viewname 
        AND pg_namespace.nspname = rec.schemaname;
        
        -- Check if it contains SECURITY DEFINER
        IF view_sql ILIKE '%security definer%' THEN
            RAISE NOTICE 'Found SECURITY DEFINER view: %.%', rec.schemaname, rec.viewname;
            
            -- Drop the view
            EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', rec.schemaname, rec.viewname);
            
            -- Recreate without SECURITY DEFINER based on known views
            IF rec.viewname = 'workout_skipping_analysis' THEN
                CREATE VIEW public.workout_skipping_analysis AS
                SELECT 
                    user_id,
                    COUNT(*) as total_workouts,
                    SUM(CASE WHEN skipped_steps_count > 0 THEN 1 ELSE 0 END) as workouts_with_skips,
                    AVG(skipped_steps_count::numeric) as avg_skipped_steps,
                    SUM(skipped_steps_count) as total_skipped_steps,
                    ROUND((SUM(CASE WHEN skipped_steps_count > 0 THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric) * 100, 2) as skip_percentage
                FROM public.workout_performance_logs 
                WHERE user_id = auth.uid()
                GROUP BY user_id;
                
            ELSIF rec.viewname = 'workout_progress_analytics' THEN
                CREATE VIEW public.workout_progress_analytics AS
                SELECT 
                    user_id,
                    DATE_TRUNC('week', created_at) as week_start,
                    COUNT(*) as total_sessions,
                    AVG(performance_score) as avg_performance,
                    AVG(completed_sets_count::numeric / NULLIF(total_sets_count, 0)) as avg_completion_rate,
                    SUM(completed_sets_count) as total_completed_sets,
                    SUM(total_sets_count) as total_planned_sets
                FROM public.workout_performance_logs 
                WHERE user_id = auth.uid()
                GROUP BY user_id, DATE_TRUNC('week', created_at);
                
            ELSIF rec.viewname = 'muscle_group_trends' THEN
                CREATE VIEW public.muscle_group_trends AS
                SELECT 
                    wpl.user_id,
                    jsonb_array_elements_text(wpl.muscle_groups_targeted) as muscle_group,
                    DATE_TRUNC('week', wpl.created_at) as week_start,
                    SUM(wpl.completed_sets_count) as total_sets,
                    COUNT(DISTINCT wpl.id) as total_exercises,
                    SUM(wpl.skipped_steps_count) as total_skipped,
                    ROUND(AVG(wpl.completed_sets_count::numeric / NULLIF(wpl.total_sets_count, 0)), 2) as avg_sets_per_exercise,
                    COUNT(DISTINCT wpl.exercises_completed) as unique_exercises,
                    ROUND(AVG(wpl.performance_score), 2) as completion_rate,
                    ROUND((SUM(wpl.skipped_steps_count)::numeric / NULLIF(SUM(wpl.total_sets_count), 0)) * 100, 2) as skip_rate,
                    LAG(SUM(wpl.completed_sets_count)) OVER (
                        PARTITION BY wpl.user_id, jsonb_array_elements_text(wpl.muscle_groups_targeted) 
                        ORDER BY DATE_TRUNC('week', wpl.created_at)
                    ) as prev_week_sets,
                    CASE 
                        WHEN AVG(wpl.performance_score) > 80 THEN 'improving'
                        WHEN AVG(wpl.performance_score) < 60 THEN 'declining'
                        ELSE 'stable'
                    END as trend_direction,
                    ARRAY_AGG(DISTINCT wpl.exercises_completed) as top_exercises
                FROM public.workout_performance_logs wpl
                WHERE wpl.user_id = auth.uid()
                AND jsonb_array_length(wpl.muscle_groups_targeted) > 0
                GROUP BY wpl.user_id, jsonb_array_elements_text(wpl.muscle_groups_targeted), DATE_TRUNC('week', wpl.created_at);
            END IF;
            
            RAISE NOTICE 'Recreated view without SECURITY DEFINER: %.%', rec.schemaname, rec.viewname;
        END IF;
    END LOOP;
END $$;