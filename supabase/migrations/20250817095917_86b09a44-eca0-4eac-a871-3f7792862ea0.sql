-- Drop any previous version
DROP FUNCTION IF EXISTS public.arena_get_leaderboard_by_domain(uuid, text, integer, integer);

-- Domain-aware leaderboard (real data, safe, includes 0-score members)
CREATE OR REPLACE FUNCTION public.arena_get_leaderboard_by_domain(
  p_group_id uuid,
  p_domain   text,
  p_limit    integer DEFAULT 50,
  p_offset   integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  score   numeric,
  rank    bigint
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized AS (         -- ensure caller belongs to this group
    SELECT 1
    FROM public.arena_memberships
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND status   = 'active'
    LIMIT 1
  ),
  d AS (                        -- normalized domain: combined|nutrition|exercise|recovery
    SELECT lower(p_domain) AS val
  ),
  group_members AS (           -- active members of the group
    SELECT DISTINCT am.user_id
    FROM public.arena_memberships am
    WHERE am.group_id = p_group_id
      AND am.status   = 'active'
  ),
  base AS (                    -- LEFT JOIN so members with no rows get 0 later
    SELECT gm.user_id,
           r.section,
           r.score
    FROM group_members gm
    LEFT JOIN public.arena_rollups_hist r
      ON r.user_id = gm.user_id
  ),
  user_scores AS (             -- per-user totals by domain or combined
    SELECT
      b.user_id,
      CASE
        WHEN (SELECT val FROM d) = 'combined'
          THEN COALESCE(SUM(b.score), 0)
        ELSE COALESCE(SUM(b.score) FILTER (WHERE b.section = (SELECT val FROM d)), 0)
      END AS total_score
    FROM base b
    GROUP BY b.user_id
  )
  SELECT
    us.user_id,
    us.total_score AS score,
    ROW_NUMBER() OVER (ORDER BY us.total_score DESC, us.user_id) AS rank
  FROM user_scores us, authorized   -- if not authorized, returns 0 rows
  ORDER BY us.total_score DESC, us.user_id
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Tight permissions
REVOKE EXECUTE ON FUNCTION public.arena_get_leaderboard_by_domain(uuid, text, integer, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.arena_get_leaderboard_by_domain(uuid, text, integer, integer) TO authenticated;