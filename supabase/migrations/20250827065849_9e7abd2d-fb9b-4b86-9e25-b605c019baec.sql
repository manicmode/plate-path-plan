-- Fix security issues with nudge monitoring views
-- Remove SECURITY DEFINER and ensure proper RLS handling

-- Drop existing views to recreate without security definer
DROP VIEW IF EXISTS public.v_nudge_daily_metrics;
DROP VIEW IF EXISTS public.v_nudge_weekly_overview;

-- Daily metrics (last 30 days) - without security definer
CREATE VIEW public.v_nudge_daily_metrics AS
WITH base AS (
  SELECT
    date_trunc('day', ts) AS day,
    nudge_id,
    COUNT(*) FILTER (WHERE event = 'shown')     AS shown,
    COUNT(*) FILTER (WHERE event = 'cta')       AS cta,
    COUNT(*) FILTER (WHERE event = 'dismissed') AS dismissed,
    COUNT(DISTINCT user_id)                     AS users
  FROM public.nudge_events
  WHERE ts >= now() - interval '30 days'
  GROUP BY 1, 2
)
SELECT
  day,
  nudge_id,
  shown,
  cta,
  dismissed,
  users,
  ROUND((cta::numeric       * 100) / NULLIF(shown, 0), 2) AS ctr_pct,
  ROUND((dismissed::numeric * 100) / NULLIF(shown, 0), 2) AS dismiss_pct
FROM base
ORDER BY day DESC, nudge_id;

-- Weekly overview (last 12 weeks) - without security definer
CREATE VIEW public.v_nudge_weekly_overview AS
WITH base AS (
  SELECT
    date_trunc('week', ts) AS week,
    nudge_id,
    COUNT(*) FILTER (WHERE event = 'shown') AS shown,
    COUNT(*) FILTER (WHERE event = 'cta')   AS cta,
    COUNT(DISTINCT user_id)                 AS users
  FROM public.nudge_events
  WHERE ts >= now() - interval '12 weeks'
  GROUP BY 1, 2
)
SELECT
  week,
  nudge_id,
  shown,
  users,
  cta,
  ROUND((cta::numeric * 100) / NULLIF(shown, 0), 2) AS ctr_pct
FROM base
ORDER BY week DESC, nudge_id;

-- Grant access to authenticated users
GRANT SELECT ON public.v_nudge_daily_metrics TO authenticated;
GRANT SELECT ON public.v_nudge_weekly_overview TO authenticated;