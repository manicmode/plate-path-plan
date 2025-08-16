-- 1) Profile-enriched public billboard view (current month / global)
-- Non-breaking: new view; existing arena_billboard stays as-is.
CREATE OR REPLACE VIEW public.arena_billboard_with_profiles AS
SELECT
  r.rank,
  r.user_id,
  r.score,
  -- prefer full name, then first, then last, then fallback to user_id
  COALESCE(
    NULLIF(CONCAT(p.first_name, ' ', p.last_name), ' '),
    p.first_name,
    p.last_name,
    r.user_id::text
  ) AS display_name,
  p.avatar_url
FROM public.arena_leaderboard_rollups r
LEFT JOIN public.user_profiles p ON p.user_id = r.user_id
WHERE r.section = 'global'
  AND r.year   = date_part('year', now())::int
  AND r.month  = date_part('month', now())::int
  AND r.rank <= 10
ORDER BY r.rank;

-- 2) Grants (allow both authenticated and anon to read)
GRANT SELECT ON TABLE public.arena_billboard_with_profiles TO authenticated;
GRANT SELECT ON TABLE public.arena_billboard_with_profiles TO anon;

-- 3) Flexible billboard RPC (arbitrary month/section/limit)
CREATE OR REPLACE FUNCTION public.arena_get_billboard(
  p_section text DEFAULT 'global',
  p_year    int  DEFAULT date_part('year', now())::int,
  p_month   int  DEFAULT date_part('month', now())::int,
  p_limit   int  DEFAULT 10
)
RETURNS TABLE (
  rank int,
  user_id uuid,
  score numeric,
  display_name text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.rank,
    r.user_id,
    r.score,
    COALESCE(
      NULLIF(CONCAT(p.first_name, ' ', p.last_name), ' '),
      p.first_name,
      p.last_name,
      r.user_id::text
    ) AS display_name,
    p.avatar_url
  FROM public.arena_leaderboard_rollups r
  LEFT JOIN public.user_profiles p ON p.user_id = r.user_id
  WHERE r.section = p_section
    AND r.year    = p_year
    AND r.month   = p_month
  ORDER BY r.rank
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.arena_get_billboard(text,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_get_billboard(text,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_get_billboard(text,int,int,int) OWNER TO postgres;