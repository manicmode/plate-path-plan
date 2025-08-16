-- Arena Billboard Materialized View Optimization

-- 1) Materialized billboard for current month/global (top 10, enriched)
--    We keep your existing view name by layering it on top of the MV.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.arena_billboard_mv AS
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
WHERE r.section = 'global'
  AND r.year   = date_part('year', now())::int
  AND r.month  = date_part('month', now())::int
  AND r.rank <= 10
ORDER BY r.rank;

-- Needed for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS uq_arena_billboard_mv_rank
  ON public.arena_billboard_mv (rank);

-- Grants for public/anon reads
GRANT SELECT ON TABLE public.arena_billboard_mv TO authenticated, anon;

-- 2) Keep your existing enriched view name; point it at the MV
CREATE OR REPLACE VIEW public.arena_billboard_with_profiles AS
SELECT * FROM public.arena_billboard_mv;

GRANT SELECT ON TABLE public.arena_billboard_with_profiles TO authenticated, anon;

-- 3) Lightweight refresher (so you can run it standalone or from cron)
CREATE OR REPLACE FUNCTION public.arena_refresh_billboard_mv()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.arena_billboard_mv;
$$;

REVOKE ALL ON FUNCTION public.arena_refresh_billboard_mv() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_refresh_billboard_mv() TO authenticated;
ALTER FUNCTION public.arena_refresh_billboard_mv() OWNER TO postgres;

-- 4) Wrapper: recompute + notifications + MV refresh (one-call job)
CREATE OR REPLACE FUNCTION public.arena_recompute_and_refresh(
  p_challenge_id uuid DEFAULT NULL,
  p_section text DEFAULT 'global',
  p_year int  DEFAULT date_part('year', now())::int,
  p_month int DEFAULT date_part('month', now())::int,
  p_limit int DEFAULT 10000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.arena_recompute_rollups_with_notifications(p_challenge_id, p_section, p_year, p_month, p_limit);
  PERFORM public.arena_refresh_billboard_mv();
END
$$;

REVOKE ALL ON FUNCTION public.arena_recompute_and_refresh(uuid,text,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_recompute_and_refresh(uuid,text,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_recompute_and_refresh(uuid,text,int,int,int) OWNER TO postgres;

-- 5) (Optional) switch cron to wrapper so MV stays fresh nightly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    -- Replace/ensure job runs recompute + refresh
    PERFORM cron.schedule(
      'arena_rollup_nightly',
      '10 0 * * *',
      'SELECT public.arena_recompute_and_refresh(NULL, ''global'');'
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping arena recompute schedule update.';
  END IF;
END $$;