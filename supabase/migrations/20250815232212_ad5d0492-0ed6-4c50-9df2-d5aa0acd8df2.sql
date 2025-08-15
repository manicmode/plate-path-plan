-- Create RPC: my_rank20_leaderboard (v0: placeholder scoring)
-- Single SECURITY DEFINER function, no views, returns stable leaderboard
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
    FROM rank20_members rm
    JOIN rank20_groups rg ON rg.id = rm.group_id
    JOIN active a ON a.cid = rg.challenge_id
  ),
  enriched AS (
    SELECT
      m.user_id,
      COALESCE(up.first_name || ' ' || up.last_name, 'User') AS display_name,
      up.avatar_url,
      0::numeric AS points,   -- placeholder
      0::integer AS streak    -- placeholder
    FROM members m
    LEFT JOIN user_profiles up ON up.user_id = m.user_id
  )
  SELECT
    e.user_id,
    e.display_name,
    e.avatar_url,
    e.points,
    e.streak,
    ROW_NUMBER() OVER (
      ORDER BY e.display_name NULLS LAST, e.user_id
    )::int AS rank
  FROM enriched e
  ORDER BY rank
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
$$;

ALTER FUNCTION public.my_rank20_leaderboard(int,int) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard(int,int) TO authenticated;