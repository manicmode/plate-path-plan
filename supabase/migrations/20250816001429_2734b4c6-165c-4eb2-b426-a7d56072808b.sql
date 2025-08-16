DROP FUNCTION IF EXISTS public.my_rank20_leaderboard(int,int);

CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  points numeric,
  streak integer,
  rank integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO pg_catalog, public
AS $$
WITH active AS (
  SELECT public._active_rank20_challenge_id() AS cid
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

-- today's raw event points, challenge-scoped
today_nutrition AS (
  SELECT e.user_id, SUM(e.points)::numeric AS raw_points, MAX(e.occurred_at) AS last_event_at
  FROM public.arena_score_events e
  JOIN active a ON a.cid = e.challenge_id
  WHERE e.category = 'nutrition' AND e.occurred_at::date = CURRENT_DATE
  GROUP BY e.user_id
),
today_exercise AS (
  SELECT e.user_id, SUM(e.points)::numeric AS raw_points, MAX(e.occurred_at) AS last_event_at
  FROM public.arena_score_events e
  JOIN active a ON a.cid = e.challenge_id
  WHERE e.category = 'exercise' AND e.occurred_at::date = CURRENT_DATE
  GROUP BY e.user_id
),
today_recovery AS (
  SELECT e.user_id, SUM(e.points)::numeric AS raw_points, MAX(e.occurred_at) AS last_event_at
  FROM public.arena_score_events e
  JOIN active a ON a.cid = e.challenge_id
  WHERE e.category = 'recovery' AND e.occurred_at::date = CURRENT_DATE
  GROUP BY e.user_id
),

-- event-based nutrition streak (challenge-scoped)
nutrition_days AS (
  SELECT DISTINCT e.user_id, e.occurred_at::date AS d
  FROM public.arena_score_events e
  JOIN active a ON a.cid = e.challenge_id
  WHERE e.category = 'nutrition'
),
nutrition_groups AS (
  SELECT
    user_id,
    d,
    d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int * INTERVAL '1 day' AS grp
  FROM nutrition_days
),
nutrition_lengths AS (
  SELECT user_id,
         grp,
         COUNT(*) AS len,
         MAX(d) AS streak_end
  FROM nutrition_groups
  GROUP BY user_id, grp
),
nutrition_streaks AS (
  SELECT user_id,
         COALESCE(MAX(CASE WHEN streak_end >= CURRENT_DATE - INTERVAL '1 day' THEN len ELSE 0 END),0)::int AS nutrition_streak
  FROM nutrition_lengths
  GROUP BY user_id
),

-- event-based combined streak (any category, challenge-scoped)
activity_days AS (
  SELECT DISTINCT e.user_id, e.occurred_at::date AS d
  FROM public.arena_score_events e
  JOIN active a ON a.cid = e.challenge_id
),
activity_groups AS (
  SELECT
    user_id,
    d,
    d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int * INTERVAL '1 day' AS grp
  FROM activity_days
),
activity_lengths AS (
  SELECT user_id,
         grp,
         COUNT(*) AS len,
         MAX(d) AS streak_end
  FROM activity_groups
  GROUP BY user_id, grp
),
combined_streaks AS (
  SELECT user_id,
         COALESCE(MAX(CASE WHEN streak_end >= CURRENT_DATE - INTERVAL '1 day' THEN len ELSE 0 END),0)::int AS combined_streak
  FROM activity_lengths
  GROUP BY user_id
),

assembled AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    COALESCE(ns.nutrition_streak,0) AS nutrition_streak,
    COALESCE(cs.combined_streak,0)  AS combined_streak,
    GREATEST(
      COALESCE(n.last_event_at,'1970-01-01'::timestamp),
      COALESCE(x.last_event_at,'1970-01-01'::timestamp),
      COALESCE(r.last_event_at,'1970-01-01'::timestamp)
    ) AS last_event_at,

    -- category scores (caps + multiplier)
    LEAST(
      COALESCE(n.raw_points,0) * LEAST(1 + COALESCE(ns.nutrition_streak,0)*0.05, 1.5),
      50
    )::numeric(10,2) AS nutrition_score,
    LEAST(COALESCE(x.raw_points,0), 30)::numeric(10,2) AS exercise_score,
    LEAST(COALESCE(r.raw_points,0), 20)::numeric(10,2) AS recovery_score
  FROM profiles p
  LEFT JOIN today_nutrition n ON n.user_id = p.user_id
  LEFT JOIN today_exercise x ON x.user_id = p.user_id
  LEFT JOIN today_recovery r ON r.user_id = p.user_id
  LEFT JOIN nutrition_streaks ns ON ns.user_id = p.user_id
  LEFT JOIN combined_streaks cs  ON cs.user_id = p.user_id
),
scored AS (
  SELECT
    a.*,
    LEAST(a.nutrition_score + a.exercise_score + a.recovery_score, 100)::numeric(10,2) AS total_points
  FROM assembled a
),
ranked AS (
  SELECT
    s.user_id,
    s.display_name,
    s.avatar_url,
    s.total_points AS points,
    s.combined_streak AS streak,
    DENSE_RANK() OVER (
      ORDER BY s.total_points DESC, s.combined_streak DESC, s.last_event_at ASC, s.user_id ASC
    )::int AS rank
  FROM scored s
)
SELECT user_id, display_name, avatar_url, points, streak, rank
FROM ranked
ORDER BY rank
LIMIT GREATEST(p_limit,1)
OFFSET GREATEST(p_offset,0);
$$;

ALTER FUNCTION public.my_rank20_leaderboard(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard(int,int) TO authenticated;