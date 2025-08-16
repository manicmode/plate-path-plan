-- 1) View (current month/global snapshot)
CREATE OR REPLACE VIEW public.arena_billboard AS
SELECT r.rank,
       r.user_id,
       r.score,
       COALESCE(NULLIF(CONCAT(p.first_name,' ',p.last_name),' '), p.first_name, p.last_name) AS display_name,
       p.avatar_url
FROM public.arena_leaderboard_rollups r
LEFT JOIN public.user_profiles p ON p.user_id = r.user_id
WHERE r.section = 'global'
  AND r.year   = date_part('year', now())::int
  AND r.month  = date_part('month', now())::int
  AND r.rank <= 10
ORDER BY r.rank;

-- 2) Allow clients to read the view
GRANT SELECT ON TABLE public.arena_billboard TO authenticated;

-- 3) My-rank RPC
CREATE OR REPLACE FUNCTION public.arena_get_my_rank(
  p_challenge_id uuid DEFAULT NULL,
  p_section      text DEFAULT 'global',
  p_year         int  DEFAULT date_part('year', now())::int,
  p_month        int  DEFAULT date_part('month', now())::int
)
RETURNS TABLE(rank int, score numeric) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.rank, r.score
  FROM public.arena_leaderboard_rollups r
  WHERE r.user_id = auth.uid()
    AND r.section = p_section
    AND r.year    = p_year
    AND r.month   = p_month
    AND r.challenge_id = COALESCE(
      p_challenge_id,
      (SELECT id FROM public.arena_challenges WHERE status='active'
       ORDER BY starts_at DESC NULLS LAST LIMIT 1)
    );
$$;

REVOKE ALL ON FUNCTION public.arena_get_my_rank(uuid,text,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_get_my_rank(uuid,text,int,int) TO authenticated;
ALTER FUNCTION public.arena_get_my_rank(uuid,text,int,int) OWNER TO postgres;

-- 4) Perf index for billboard & my-rank lookups
CREATE INDEX IF NOT EXISTS idx_rollups_slice
  ON public.arena_leaderboard_rollups (section, year, month, rank);