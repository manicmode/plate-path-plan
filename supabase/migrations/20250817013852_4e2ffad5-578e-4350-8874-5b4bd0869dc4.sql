-- Optimize arena_billboard_with_profiles view for better performance
CREATE OR REPLACE VIEW public.arena_billboard_with_profiles AS
WITH enrolled AS (
  SELECT m.user_id, m.joined_at as season_at
  FROM public.arena_memberships m
  WHERE date_trunc('month', m.joined_at) = date_trunc('month', now())
),
scores AS (
  SELECT mv.user_id, mv.season_at, mv.points
  FROM public.arena_billboard_mv mv
  WHERE date_trunc('month', mv.season_at) = date_trunc('month', now())
)
SELECT
  en.user_id,
  en.season_at,
  COALESCE(sc.points, 0) AS points,
  RANK() OVER (ORDER BY COALESCE(sc.points,0) DESC, p.username NULLS LAST, en.user_id) AS rank,
  p.username,
  p.avatar_url
FROM enrolled en
LEFT JOIN scores sc ON sc.user_id = en.user_id
LEFT JOIN public.user_profiles p ON p.user_id = en.user_id;

-- Add supporting indexes for faster month filtering
CREATE INDEX IF NOT EXISTS idx_arena_memberships_month 
ON public.arena_memberships (date_trunc('month', joined_at));

CREATE INDEX IF NOT EXISTS idx_arena_billboard_mv_month 
ON public.arena_billboard_mv (date_trunc('month', season_at));