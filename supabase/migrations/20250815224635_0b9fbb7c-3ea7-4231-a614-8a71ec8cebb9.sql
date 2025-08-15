-- STEP 2: Create arena_leaderboard_view (Path B - fallback using membership, active Arena only)
CREATE OR REPLACE VIEW public.arena_leaderboard_view AS
WITH base AS (
  SELECT DISTINCT
    rm.user_id,
    rg.challenge_id
  FROM public.rank20_members rm
  JOIN public.rank20_groups rg ON rg.id = rm.group_id
  WHERE rg.challenge_id = public._active_rank20_challenge_id()  -- 👈 scope to active Arena
)
SELECT
  b.user_id,
  b.challenge_id,
  0::numeric AS points,
  0::integer AS streak,
  ROW_NUMBER() OVER (ORDER BY COALESCE(p.first_name || ' ' || p.last_name, 'User') ASC, b.user_id ASC) AS rank,  -- 👈 stable rank
  COALESCE(p.first_name || ' ' || p.last_name, 'User') AS display_name,
  p.avatar_url
FROM base b
LEFT JOIN public.user_profiles p ON p.user_id = b.user_id;

GRANT SELECT ON public.arena_leaderboard_view TO authenticated;

-- STEP 3: Create my_rank20_leaderboard RPC matching UI expectations
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard(p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  points numeric,
  streak integer,
  rank int
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
  SELECT
    lb.user_id,
    lb.display_name,
    lb.avatar_url,
    lb.points,
    lb.streak,
    lb.rank
  FROM public.arena_leaderboard_view lb
  ORDER BY lb.rank ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0)
$$;

ALTER FUNCTION public.my_rank20_leaderboard(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard(int,int) TO authenticated;