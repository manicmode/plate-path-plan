-- Drop and recreate security definer views with safe SECURITY INVOKER behavior
-- This fixes the 4 views flagged in Supabase Security Advisor

-- Drop existing SECURITY DEFINER views
DROP VIEW IF EXISTS public.routine_performance_analytics;
DROP VIEW IF EXISTS public.workout_skipping_analysis;
DROP VIEW IF EXISTS public.muscle_group_trends;
DROP VIEW IF EXISTS public.workout_progress_analytics;

-- Recreate routine_performance_analytics with SECURITY INVOKER (default behavior)
CREATE VIEW public.routine_performance_analytics AS
SELECT wl.user_id,
    ar.routine_name,
    count(*) AS total_sessions,
    avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) * 100::double precision AS avg_completion_rate,
    date_trunc('week'::text, wl.completed_at) AS week_start,
        CASE
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.9::double precision THEN 'excellent'::text
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.75::double precision THEN 'good'::text
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.6::double precision THEN 'fair'::text
            ELSE 'needs_improvement'::text
        END AS performance_grade
   FROM workout_logs wl
     LEFT JOIN ai_routines ar ON wl.routine_id = ar.id
  WHERE wl.user_id = auth.uid() AND wl.completed_at >= (CURRENT_DATE - '84 days'::interval)
  GROUP BY wl.user_id, ar.routine_name, (date_trunc('week'::text, wl.completed_at))
  ORDER BY (date_trunc('week'::text, wl.completed_at)) DESC, ar.routine_name;

-- Recreate workout_skipping_analysis with SECURITY INVOKER (default behavior)
CREATE VIEW public.workout_skipping_analysis AS
SELECT user_id,
    count(*) AS total_workouts,
    avg(skipped_sets) AS avg_skipped_sets,
    avg(sets_completed::double precision / NULLIF(target_sets, 0)::double precision) * 100::double precision AS avg_completion_rate,
    count(
        CASE
            WHEN skipped_sets > 0 THEN 1
            ELSE NULL::integer
        END) AS workouts_with_skips,
    count(
        CASE
            WHEN sets_completed = target_sets THEN 1
            ELSE NULL::integer
        END) AS perfect_workouts,
    date_trunc('month'::text, completed_at) AS month_year
   FROM workout_logs
  WHERE user_id = auth.uid() AND completed_at >= (CURRENT_DATE - '6 mons'::interval)
  GROUP BY user_id, (date_trunc('month'::text, completed_at))
  ORDER BY (date_trunc('month'::text, completed_at)) DESC;

-- Recreate muscle_group_trends with SECURITY INVOKER (default behavior)
CREATE VIEW public.muscle_group_trends AS
WITH muscle_categories AS (
         SELECT wl.user_id,
                CASE
                    WHEN wl.exercise_name ~~* ANY (ARRAY['%squat%'::text, '%lunge%'::text, '%leg%'::text, '%quad%'::text, '%hamstring%'::text, '%calf%'::text]) THEN 'legs'::text
                    WHEN wl.exercise_name ~~* ANY (ARRAY['%chest%'::text, '%bench%'::text, '%push up%'::text, '%pec%'::text]) THEN 'chest'::text
                    WHEN wl.exercise_name ~~* ANY (ARRAY['%back%'::text, '%row%'::text, '%pull%'::text, '%lat%'::text, '%deadlift%'::text]) THEN 'back'::text
                    WHEN wl.exercise_name ~~* ANY (ARRAY['%shoulder%'::text, '%press%'::text, '%raise%'::text, '%delt%'::text]) THEN 'shoulders'::text
                    WHEN wl.exercise_name ~~* ANY (ARRAY['%arm%'::text, '%bicep%'::text, '%tricep%'::text, '%curl%'::text]) THEN 'arms'::text
                    ELSE 'other'::text
                END AS muscle_group,
            wl.exercise_name,
            wl.sets_completed,
            wl.skipped_sets,
            date_trunc('week'::text, wl.completed_at) AS week_start,
            wl.completed_at
           FROM workout_logs wl
          WHERE wl.user_id = auth.uid() AND wl.completed_at >= (CURRENT_DATE - '56 days'::interval)
        ), weekly_stats AS (
         SELECT muscle_categories.user_id,
            muscle_categories.muscle_group,
            muscle_categories.week_start,
            sum(muscle_categories.sets_completed) AS total_sets,
            count(*) AS total_exercises,
            sum(muscle_categories.skipped_sets) AS total_skipped,
            avg(muscle_categories.sets_completed) AS avg_sets_per_exercise,
            count(DISTINCT muscle_categories.exercise_name) AS unique_exercises
           FROM muscle_categories
          WHERE muscle_categories.muscle_group <> 'other'::text
          GROUP BY muscle_categories.user_id, muscle_categories.muscle_group, muscle_categories.week_start
        ), top_exercises AS (
         SELECT muscle_categories.user_id,
            muscle_categories.muscle_group,
            muscle_categories.exercise_name,
            count(*) AS frequency,
            row_number() OVER (PARTITION BY muscle_categories.user_id, muscle_categories.muscle_group ORDER BY (count(*)) DESC) AS exercise_rank
           FROM muscle_categories
          WHERE muscle_categories.muscle_group <> 'other'::text
          GROUP BY muscle_categories.user_id, muscle_categories.muscle_group, muscle_categories.exercise_name
        )
 SELECT ws.user_id,
    ws.muscle_group,
    ws.week_start,
    ws.total_sets,
    ws.total_exercises,
    ws.total_skipped,
    ws.avg_sets_per_exercise,
    ws.unique_exercises,
    round(ws.total_sets::numeric / NULLIF(ws.total_sets + ws.total_skipped, 0)::numeric * 100::numeric, 1) AS completion_rate,
    round(ws.total_skipped::numeric / NULLIF(ws.total_sets + ws.total_skipped, 0)::numeric * 100::numeric, 1) AS skip_rate,
    lag(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) AS prev_week_sets,
        CASE
            WHEN lag(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) IS NULL THEN 'stable'::text
            WHEN ws.total_sets > lag(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'increasing'::text
            WHEN ws.total_sets < lag(ws.total_sets) OVER (PARTITION BY ws.user_id, ws.muscle_group ORDER BY ws.week_start) THEN 'decreasing'::text
            ELSE 'stable'::text
        END AS trend_direction,
    array_agg(te.exercise_name ORDER BY te.frequency DESC) FILTER (WHERE te.exercise_rank <= 3) AS top_exercises
   FROM weekly_stats ws
     LEFT JOIN top_exercises te ON ws.user_id = te.user_id AND ws.muscle_group = te.muscle_group
  WHERE ws.user_id = auth.uid()
  GROUP BY ws.user_id, ws.muscle_group, ws.week_start, ws.total_sets, ws.total_exercises, ws.total_skipped, ws.avg_sets_per_exercise, ws.unique_exercises
  ORDER BY ws.muscle_group, ws.week_start DESC;

-- Recreate workout_progress_analytics with SECURITY INVOKER (default behavior)
CREATE VIEW public.workout_progress_analytics AS
SELECT wl.user_id,
    ar.routine_name,
    count(*) AS total_sessions,
    avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) * 100::double precision AS avg_completion_rate,
    date_trunc('week'::text, wl.completed_at) AS week_start,
        CASE
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.9::double precision THEN 'excellent'::text
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.75::double precision THEN 'good'::text
            WHEN avg(wl.sets_completed::double precision / NULLIF(wl.target_sets, 0)::double precision) >= 0.6::double precision THEN 'fair'::text
            ELSE 'needs_improvement'::text
        END AS performance_tier
   FROM workout_logs wl
     LEFT JOIN ai_routines ar ON wl.routine_id = ar.id
  WHERE wl.user_id = auth.uid() AND wl.completed_at >= (CURRENT_DATE - '84 days'::interval)
  GROUP BY wl.user_id, ar.routine_name, (date_trunc('week'::text, wl.completed_at))
  ORDER BY (date_trunc('week'::text, wl.completed_at)) DESC, ar.routine_name;