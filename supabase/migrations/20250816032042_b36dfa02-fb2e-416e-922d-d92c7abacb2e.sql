-- Create 4 sectioned leaderboard functions with placeholder scoring

-- Combined Leaderboard
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard_combined(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, points numeric, streak integer, rank integer)
LANGUAGE sql SECURITY DEFINER STABLE
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
scored AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    0.00::numeric(10,2) AS points,
    0::int AS streak
  FROM profiles p
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

-- Nutrition Leaderboard
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard_nutrition(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, points numeric, streak integer, rank integer)
LANGUAGE sql SECURITY DEFINER STABLE
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
scored AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    0.00::numeric(10,2) AS points,
    0::int AS streak
  FROM profiles p
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

-- Exercise Leaderboard
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard_exercise(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, points numeric, streak integer, rank integer)
LANGUAGE sql SECURITY DEFINER STABLE
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
scored AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    0.00::numeric(10,2) AS points,
    0::int AS streak
  FROM profiles p
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

-- Recovery Leaderboard
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard_recovery(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, points numeric, streak integer, rank integer)
LANGUAGE sql SECURITY DEFINER STABLE
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
scored AS (
  SELECT
    p.user_id,
    p.display_name,
    p.avatar_url,
    0.00::numeric(10,2) AS points,
    0::int AS streak
  FROM profiles p
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

-- Set proper permissions for all functions
ALTER FUNCTION public.my_rank20_leaderboard_combined(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard_combined(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_combined(int,int) TO authenticated;

ALTER FUNCTION public.my_rank20_leaderboard_nutrition(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) TO authenticated;

ALTER FUNCTION public.my_rank20_leaderboard_exercise(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard_exercise(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_exercise(int,int) TO authenticated;

ALTER FUNCTION public.my_rank20_leaderboard_recovery(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard_recovery(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_recovery(int,int) TO authenticated;