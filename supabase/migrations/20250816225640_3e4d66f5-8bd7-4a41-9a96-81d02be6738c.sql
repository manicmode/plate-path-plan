-- Fix friends leaderboard function to avoid duplicate "me" rows and add performance indexes

-- Replace function with corrected logic (no cross join, uses EXISTS instead)
CREATE OR REPLACE FUNCTION public.arena_get_friends_leaderboard_with_profiles(
  p_challenge_id uuid DEFAULT NULL,
  p_section      text DEFAULT 'global',
  p_year         int  DEFAULT date_part('year', now())::int,
  p_month        int  DEFAULT date_part('month', now())::int,
  p_limit        int  DEFAULT 100
)
RETURNS TABLE(
  rank int,
  user_id uuid,
  score numeric,
  display_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH me AS (
  SELECT auth.uid() AS uid
),
-- Directional edges table: user_friends(user_id -> friend_id), status='accepted'
friend_edges AS (
  -- dedup just in case
  SELECT DISTINCT f.friend_id
  FROM me m
  JOIN public.user_friends f ON f.user_id = m.uid
  WHERE f.status = 'accepted'
  UNION
  SELECT DISTINCT f.user_id
  FROM me m
  JOIN public.user_friends f ON f.friend_id = m.uid
  WHERE f.status = 'accepted'
),
slice AS (
  SELECT r.rank, r.user_id, r.score
  FROM public.arena_leaderboard_rollups r, me
  WHERE (r.challenge_id = COALESCE(
           p_challenge_id,
           (SELECT id FROM public.arena_challenges WHERE status='active' ORDER BY starts_at DESC NULLS LAST LIMIT 1)
        ))
    AND r.section = p_section
    AND r.year = p_year
    AND r.month = p_month
    AND (
      r.user_id = (SELECT uid FROM me)
      OR EXISTS (SELECT 1 FROM friend_edges fe WHERE fe.friend_id = r.user_id)
    )
  ORDER BY r.rank ASC
  LIMIT p_limit
)
SELECT
  s.rank,
  s.user_id,
  s.score,
  COALESCE(CONCAT(p.first_name, ' ', p.last_name), p.first_name, p.last_name) AS display_name,
  COALESCE(p.first_name, CONCAT(p.first_name, ' ', p.last_name)) AS username,
  p.avatar_url
FROM slice s
LEFT JOIN public.user_profiles p ON p.user_id = s.user_id
ORDER BY s.rank ASC, s.user_id;
$$;

-- Set proper permissions
REVOKE ALL ON FUNCTION public.arena_get_friends_leaderboard_with_profiles(uuid,text,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_get_friends_leaderboard_with_profiles(uuid,text,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_get_friends_leaderboard_with_profiles(uuid,text,int,int,int) OWNER TO postgres;

-- Add performance indexes for fast lookups both directions
CREATE INDEX IF NOT EXISTS idx_user_friends_user_status   ON public.user_friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_friends_friend_status ON public.user_friends(friend_id, status);