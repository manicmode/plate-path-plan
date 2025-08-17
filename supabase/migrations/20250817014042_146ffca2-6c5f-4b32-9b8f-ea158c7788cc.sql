-- Optimize arena_billboard_with_profiles view for better performance
-- Use date_trunc for better index performance and improve tie-breaker logic
CREATE OR REPLACE VIEW public.arena_billboard_with_profiles AS
WITH enrolled AS (
  SELECT m.user_id, m.joined_at
  FROM public.arena_memberships m
  WHERE date_trunc('month', m.joined_at) = date_trunc('month', now())
),
scores AS (
  SELECT mv.user_id, mv.score as points
  FROM public.arena_billboard_mv mv
)
SELECT
  en.user_id,
  en.joined_at as season_at,
  COALESCE(sc.points, 0) AS points,
  RANK() OVER (ORDER BY COALESCE(sc.points,0) DESC, 
               COALESCE(p.first_name || ' ' || p.last_name, '') NULLS LAST, 
               en.user_id) AS rank,
  COALESCE(p.first_name || ' ' || p.last_name, '') as username,
  p.avatar_url
FROM enrolled en
LEFT JOIN scores sc ON sc.user_id = en.user_id
LEFT JOIN public.user_profiles p ON p.user_id = en.user_id;

-- Add supporting index for faster month filtering on memberships
CREATE INDEX IF NOT EXISTS idx_arena_memberships_month 
ON public.arena_memberships (date_trunc('month', joined_at));