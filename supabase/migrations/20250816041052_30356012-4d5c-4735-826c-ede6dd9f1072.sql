-- 1) Recreate nutrition RPC with ctx actually referenced + SECURITY INVOKER
DROP FUNCTION IF EXISTS public.my_rank20_leaderboard_nutrition(int,int);

CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard_nutrition(
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, points numeric, streak integer, rank integer)
LANGUAGE sql
-- SECURITY INVOKER ensures RLS applies to the caller (authenticated), not postgres
STABLE
SET search_path TO pg_catalog, public
AS $$
WITH
ctx AS (
  -- set the leaderboard context
  SELECT set_config('app.ctx','leaderboard',true) AS _ctx
),
active AS (
  -- reference ctx so it cannot be pruned by the planner
  SELECT public._active_rank20_challenge_id() AS cid, (SELECT _ctx FROM ctx) AS _ctx_ref
),
members AS (
  SELECT DISTINCT rm.user_id
  FROM public.rank20_members rm
  JOIN public.rank20_groups rg ON rg.id = rm.group_id
  JOIN active a ON a.cid = rg.challenge_id
),
profiles AS (
  SELECT
    m.user_id,
    COALESCE(NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''), 'User') AS display_name,
    up.avatar_url
  FROM members m
  LEFT JOIN public.user_profiles up ON up.user_id = m.user_id
),
activity_days AS (
  SELECT DISTINCT user_id, created_at::date AS d FROM public.meal_scores
  UNION
  SELECT DISTINCT user_id, created_at::date AS d FROM public.nutrition_logs
  UNION
  SELECT DISTINCT user_id, created_at::date AS d FROM public.hydration_logs
  UNION
  SELECT DISTINCT user_id, created_at::date AS d FROM public.supplement_logs
),
streak_groups AS (
  SELECT
    user_id,
    d,
    d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d ASC))::int * INTERVAL '1 day' AS grp
  FROM activity_days
),
streaks AS (
  SELECT user_id, COUNT(*) AS current_streak
  FROM streak_groups
  GROUP BY user_id, grp
  HAVING MAX(d) = CURRENT_DATE
),
today_scores AS (
  SELECT 
    p.user_id,
    LEAST(
      COALESCE((SELECT AVG(ms.score)/100.0 * 25.0
                FROM public.meal_scores ms
                WHERE ms.user_id = p.user_id AND ms.created_at::date = CURRENT_DATE), 0.0),
      25.0
    ) AS meal_points,
    LEAST(
      COALESCE((SELECT AVG(nl.quality_score)/100.0 * 15.0
                FROM public.nutrition_logs nl
                WHERE nl.user_id = p.user_id AND nl.created_at::date = CURRENT_DATE), 0.0),
      15.0
    ) AS nutrition_points,
    LEAST(
      COALESCE((SELECT LEAST(SUM(hl.volume)/2000.0, 1.0) * 5.0
                FROM public.hydration_logs hl
                WHERE hl.user_id = p.user_id AND hl.created_at::date = CURRENT_DATE), 0.0),
      5.0
    ) AS hydration_points,
    LEAST(
      COALESCE((SELECT LEAST(COUNT(*), 5) * 1.0
                FROM public.supplement_logs sl
                WHERE sl.user_id = p.user_id AND sl.created_at::date = CURRENT_DATE), 0.0),
      5.0
    ) AS supplement_points
  FROM profiles p
),
scored AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    LEAST(
      (ts.meal_points + ts.nutrition_points + ts.hydration_points + ts.supplement_points)
      * LEAST(1.0 + COALESCE(s.current_streak,0) * 0.05, 1.5),
      50.0
    )::numeric(10,2) AS points,
    COALESCE(s.current_streak,0)::int AS streak
  FROM profiles p
  LEFT JOIN today_scores ts ON ts.user_id = p.user_id
  LEFT JOIN streaks s      ON s.user_id  = p.user_id
),
ranked AS (
  SELECT
    s.user_id, s.display_name, s.avatar_url, s.points, s.streak,
    DENSE_RANK() OVER (ORDER BY s.points DESC, s.streak DESC, s.user_id ASC)::int AS rank
  FROM scored s
)
SELECT user_id, display_name, avatar_url, points, streak, rank
FROM ranked
ORDER BY rank
LIMIT GREATEST(p_limit,1)
OFFSET GREATEST(p_offset,0);
$$;

-- keep ownership & grants
ALTER FUNCTION public.my_rank20_leaderboard_nutrition(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) TO authenticated;