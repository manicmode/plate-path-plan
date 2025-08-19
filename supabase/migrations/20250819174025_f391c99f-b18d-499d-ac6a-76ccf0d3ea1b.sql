-- Add streak computation for habits: index + view (fixed)

-- A) Index: safe composite index (habit_id, ts DESC) instead of expression index
CREATE INDEX IF NOT EXISTS idx_habit_log_habit_ts
ON public.habit_log (habit_id, ts DESC);

-- B) View: v_habit_streaks with UTC day boundaries (islands & gaps algorithm)
CREATE OR REPLACE VIEW public.v_habit_streaks AS
WITH base AS (
  SELECT
    uh.user_id,
    uh.id        AS habit_id,
    uh.slug      AS habit_slug,
    -- Normalize to UTC day; this avoids TZ-dependent casts
    ((hl.ts AT TIME ZONE 'UTC')::date) AS d
  FROM public.user_habit uh
  LEFT JOIN public.habit_log hl
    ON hl.habit_id = uh.id
  WHERE uh.status IN ('active','paused','completed')
),
days AS (
  SELECT DISTINCT user_id, habit_id, habit_slug, d
  FROM base
  WHERE d IS NOT NULL
),
islands AS (
  SELECT
    user_id, habit_id, habit_slug, d,
    (d - (ROW_NUMBER() OVER (PARTITION BY user_id, habit_id ORDER BY d))::int) AS grp
  FROM days
),
runs AS (
  SELECT
    user_id, habit_id, habit_slug,
    MIN(d) AS start_day,
    MAX(d) AS end_day,
    COUNT(*)::int AS length
  FROM islands
  GROUP BY user_id, habit_id, habit_slug, grp
),
longest AS (
  SELECT user_id, habit_id, habit_slug,
         MAX(length)::int AS longest_streak
  FROM runs
  GROUP BY user_id, habit_id, habit_slug
),
current AS (
  SELECT r.user_id, r.habit_id, r.habit_slug, r.length::int AS current_streak
  FROM runs r
  WHERE r.end_day = (CURRENT_DATE)  -- UTC midnight boundary
),
last_done AS (
  SELECT user_id, habit_id, habit_slug, MAX(d) AS last_done_on
  FROM days
  GROUP BY user_id, habit_id, habit_slug
)
SELECT
  uh.user_id,
  uh.slug AS habit_slug,
  COALESCE(c.current_streak, 0) AS current_streak,
  COALESCE(l.longest_streak, 0) AS longest_streak,
  ld.last_done_on,
  (ld.last_done_on = CURRENT_DATE) AS done_today
FROM public.user_habit uh
LEFT JOIN current c
  ON c.user_id = uh.user_id AND c.habit_id = uh.id
LEFT JOIN longest l
  ON l.user_id = uh.user_id AND l.habit_id = uh.id
LEFT JOIN last_done ld
  ON ld.user_id = uh.user_id AND ld.habit_id = uh.id
WHERE uh.status IN ('active','paused','completed');