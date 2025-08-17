-- Update arena_billboard_with_profiles to use month-scoped data
DROP VIEW IF EXISTS public.arena_billboard_with_profiles;

-- Create properly month-scoped view using arena_leaderboard_rollups
CREATE VIEW public.arena_billboard_with_profiles AS
WITH enrolled AS (
  SELECT m.user_id
  FROM public.arena_memberships m
  WHERE m.status = 'active'
),
scores AS (
  SELECT ar.user_id, ar.score as points
  FROM public.arena_leaderboard_rollups ar
  WHERE ar.year = EXTRACT(YEAR FROM now())::int
    AND ar.month = EXTRACT(MONTH FROM now())::int
    AND ar.section = 'global'
)
SELECT
  en.user_id,
  date_trunc('month', now()) as season_at,
  COALESCE(sc.points, 0) AS points,
  RANK() OVER (
    ORDER BY COALESCE(sc.points,0) DESC, 
             COALESCE(p.first_name || ' ' || p.last_name, '') NULLS LAST, 
             en.user_id
  ) AS rank,
  COALESCE(p.first_name || ' ' || p.last_name, '') as username,
  p.avatar_url
FROM enrolled en
LEFT JOIN scores sc ON sc.user_id = en.user_id
LEFT JOIN public.user_profiles p ON p.user_id = en.user_id;